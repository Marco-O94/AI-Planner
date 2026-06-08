# Implementation Plan — ProjectNotes (DDD Knowledge → Typed Artifact Manager)

> **Agent contract**: This is an agent-gated plan. Implement **one phase at a time**, in order. After each phase, STOP and report what was built, then wait for approval before the next phase. Do not skip ahead. Do not invent requirements not stated here — if something is ambiguous, ask. Apply YAGNI / DRY / KISS. Prefer explicit, readable code over framework magic.

---

## 0. Objective

Build a system to capture typed **notes** (knowledge: requirements, constraints, decisions), **tasks** (work to do, with dependencies), and **documents** (uploaded reference material) about projects, organized by **project** and **bounded context / domain** (work follows DDD), persist them, and expose them via an **MCP server** so the AI (Claude Code) can generate **typed artifacts** from the collected context. The default artifact type is a **Development Plan**, but users can define their own **artifact types** (e.g. copy brief, research synthesis, analysis report) — each declaring its **generation instructions** and a **manifest of output files** (which files to produce, with a note on each file's purpose). Notes and documents are **semantically searchable** (Qdrant + FastEmbed). Artifacts are **versioned** (iteration history + diff), can carry an **execution checklist** updated live by the agent, and are **exportable to files** for use directly in repos. Each project carries **structured metadata** (languages, frameworks + versions, databases, status, repo) surfaced in a **filterable dashboard**. The system manages **skills** (reusable agent instructions, GLOBAL or per-PROJECT) and **user-defined project templates** for reusable scaffolding.

**Deliverables in one monorepo (decoupled services):**
1. `backend/` — FastAPI + PostgreSQL (entities) + Qdrant/FastEmbed (vectors), storage + REST API
2. `frontend/` — Next.js 15 + shadcn/ui + framer-motion (dashboard, capture & management UI)
3. `mcp/` — Python MCP server (exposes context/search/artifacts/types/skills/documents as tools to the AI)
4. Infra — `postgres` + `qdrant` services, assembled via `docker-compose.yml`

---

## 1. Domain model (DDD-aligned)

The data model itself follows DDD vocabulary. Read this section carefully before writing any code.

### Aggregates / Entities

```
Technology (lookup / canonical reference data)
  ├─ id: UUID
  ├─ kind: enum(LANGUAGE | FRAMEWORK | DATABASE | TOOL)
  ├─ name: str            (canonical, e.g. "Next.js", "Laravel", "PostgreSQL", "Python")
  ├─ slug: str (unique per kind)
  # Seeded with common values; new ones can be created on the fly from the UI.

Project (aggregate root)
  ├─ id: UUID
  ├─ name: str
  ├─ slug: str (unique, url-safe)
  ├─ description: str | None
  ├─ status: enum(ACTIVE | PAUSED | ARCHIVED)   # default ACTIVE
  ├─ repository_url: str | None
  ├─ metadata: JSON | None       # free-form extra characteristics (deployment target, team, etc.)
  ├─ created_at / updated_at
  # Technologies attached via ProjectTechnology (languages, frameworks, databases, tools).

ProjectTechnology (association)
  ├─ project_id: UUID (FK → Project)
  ├─ technology_id: UUID (FK → Technology)
  ├─ version: str | None   # optional version, e.g. "15" for Next.js, "11" for Laravel
  └─ PK (project_id, technology_id)

Domain  (a bounded context within a project)
  ├─ id: UUID
  ├─ project_id: UUID (FK → Project)
  ├─ name: str            (e.g. "Payments", "Routing", "Identity")
  ├─ slug: str            (unique within project)
  ├─ description: str | None
  ├─ ubiquitous_language: JSON  # term -> definition map, optional
  ├─ created_at / updated_at

Note
  ├─ id: UUID
  ├─ project_id: UUID (FK → Project)
  ├─ domain_id: UUID | None (FK → Domain; null = project-level note)
  ├─ type: enum(REQUIREMENT | CONSTRAINT | DECISION | QUESTION | SNIPPET | REFERENCE)
  ├─ title: str | None
  ├─ content: str (markdown)
  ├─ tags: str[]
  ├─ created_at / updated_at

Task
  ├─ id: UUID
  ├─ project_id: UUID (FK → Project)
  ├─ domain_id: UUID | None (FK → Domain; null = project-level task)
  ├─ title: str
  ├─ description: str | None (markdown)
  ├─ status: enum(TODO | IN_PROGRESS | DONE)   # default TODO
  ├─ priority: enum(LOW | MEDIUM | HIGH)        # default MEDIUM
  ├─ depends_on: UUID[]    # ids of tasks that must precede this one (same project)
  ├─ tags: str[]
  ├─ created_at / updated_at

ArtifactType  (user-defined kind of output the AI can generate; one built-in default)
  ├─ id: UUID
  ├─ scope: enum(GLOBAL | PROJECT)        # reusable everywhere, or specific to a project
  ├─ project_id: UUID | None (FK → Project; NULL iff scope == GLOBAL)
  ├─ name: str            (e.g. "Development Plan", "Copy Brief", "Research Synthesis", "Analysis Report")
  ├─ slug: str
  ├─ description: str | None
  ├─ instructions: str (markdown)   # the generation template/prompt for this type — what the AI should do
  ├─ output_files: JSON   # manifest: [{ path: "analysis.md", note: "main findings, structured" }, ...]
  ├─ is_default: bool     # the built-in "Development Plan" type is seeded as default
  ├─ created_at / updated_at
  # "Development Plan" ships as the default GLOBAL type. Users add their own (copy, research, analysis, ...).
  # Each type declares WHICH FILES it should produce and a per-file note describing that file's purpose.

Artifact  (generalization of "Plan": any typed output generated from project context)
  ├─ id: UUID
  ├─ project_id: UUID (FK → Project)
  ├─ domain_id: UUID | None (FK → Domain)
  ├─ artifact_type_id: UUID (FK → ArtifactType)
  ├─ title: str
  ├─ slug: str                # stable identity across versions (unique per project)
  ├─ status: enum(DRAFT | APPROVED | ARCHIVED)
  ├─ current_version_id: UUID | None (FK → ArtifactVersion)
  ├─ created_at / updated_at
  # A stable container; content (one or more files) lives in versions.

ArtifactVersion
  ├─ id: UUID
  ├─ artifact_id: UUID (FK → Artifact)
  ├─ version_number: int          # 1, 2, 3... incrementing per artifact
  ├─ source_note_ids: UUID[]      # provenance for THIS version
  ├─ source_task_ids: UUID[]
  ├─ source_document_ids: UUID[]  # documents used as context for this version
  ├─ change_note: str | None
  ├─ created_at
  # Append-only. Regenerating creates a new version; old ones kept for diffing.

ArtifactFile  (the actual files produced for a version — fulfils the type's manifest)
  ├─ id: UUID
  ├─ artifact_version_id: UUID (FK → ArtifactVersion)
  ├─ path: str            # matches a manifest entry where possible (e.g. "analysis.md", "snippet.py")
  ├─ content: str         # the produced file content (text/markdown/code/csv...)
  ├─ search_tsv: tsvector (GENERATED from path + content)  # full-text, GIN-indexed
  ├─ note: str | None     # carried from the manifest or set by the agent
  ├─ order_index: int

ArtifactPhase  (execution tracking — optional, one row per phase of a version; mainly for plan-like types)
  ├─ id: UUID
  ├─ artifact_version_id: UUID (FK → ArtifactVersion)
  ├─ order_index: int
  ├─ title: str
  ├─ status: enum(PENDING | IN_PROGRESS | DONE)   # default PENDING
  ├─ note: str | None
  ├─ updated_at
  # Parsed from a primary file's headings when applicable; updatable from UI or via MCP.

Skill
  ├─ id: UUID
  ├─ scope: enum(GLOBAL | PROJECT)
  ├─ project_id: UUID | None (FK → Project; NULL iff scope == GLOBAL)
  ├─ name: str
  ├─ slug: str
  ├─ description: str            # short trigger description (when the agent should use it)
  ├─ content: str (markdown — the skill body, SKILL.md-style)
  ├─ tags: str[]
  ├─ created_at / updated_at

ProjectSkill  (association — lets a GLOBAL skill be explicitly attached to a project)
  ├─ project_id: UUID (FK → Project)
  ├─ skill_id: UUID (FK → Skill)
  └─ PK (project_id, skill_id)

Document  (uploaded project reference material — specs, PDFs, diagrams-as-text, exports)
  ├─ id: UUID
  ├─ project_id: UUID (FK → Project)
  ├─ domain_id: UUID | None (FK → Domain)
  ├─ title: str
  ├─ filename: str
  ├─ mime_type: str
  ├─ storage_path: str         # where the original file is stored (local volume; pluggable later)
  ├─ extracted_text: str | None   # text extracted for indexing (pdf/docx/md/txt)
  ├─ search_tsv: tsvector (GENERATED from title + extracted_text)  # Postgres full-text, GIN-indexed
  ├─ tags: str[]
  ├─ indexed_at: datetime | None  # set when vectorized into Qdrant
  ├─ created_at / updated_at

ProjectTemplate  (user-defined, reusable project scaffold)
  ├─ id: UUID
  ├─ name: str
  ├─ slug: str (unique)
  ├─ description: str | None
  ├─ definition: JSON   # { domains: [...], technologies: [{kind,name,version}], skill_ids: [...], starter_notes/tasks: [...] }
  ├─ created_at / updated_at
  # Applying a template to a new project materializes its domains, attaches technologies & skills,
  # and optionally creates starter notes/tasks. Fully user-authored — no built-in templates required.
```

> **Two complementary search engines — both used.**
> - **Lexical / full-text (Postgres `tsvector` + GIN):** finds exact words and phrases *inside files* (artifact files and document text) and inside notes. Supports prefix, AND/OR, relevance ranking (`ts_rank`) and highlighted snippets (`ts_headline`). This is the primary engine for the "search words inside files" requirement. Add a `search_tsv` GENERATED column + GIN index on `documents`, `artifact_files`, and `notes`.
> - **Semantic / vector (Qdrant + FastEmbed):** finds material by *meaning* even when the exact words differ. Used for "find related knowledge" retrieval.
> - **Hybrid:** an endpoint runs both and fuses results (Reciprocal Rank Fusion) for best recall+precision (same pattern as the BM25+vector tender platform).
>
> **Scoping (global vs per-project).** Both engines scope by `project_id`/`domain_id`: Qdrant via payload filters (each point carries `{type, id, project_id, domain_id, title, tags}`), Postgres via `WHERE project_id = ...`. So the same search runs globally across all projects or narrowed to one. Qdrant is the source of truth ONLY for vectors; Postgres remains authoritative for all entities and is rebuildable. FastEmbed runs in the backend (CPU). (The previously discussed Obsidian plugin is intentionally NOT integrated — a dedicated modern store is used instead.)

### Invariants
- A `Note.domain_id`, if set, MUST belong to the same `project_id`. Enforce in the service layer.
- A `Task.domain_id`, if set, MUST belong to the same `project_id`. Same enforcement.
- `Domain.slug` unique per project; `Project.slug` globally unique.
- Deleting a `Project` cascades to its `Domain`, `Note`, `Task`, `Artifact`.
- Deleting a `Domain` sets `Note.domain_id` / `Task.domain_id` / `Artifact.domain_id` to NULL (do NOT delete the items).
- **Skill scope:** `scope == GLOBAL` ⟺ `project_id IS NULL`; `scope == PROJECT` ⟺ `project_id IS NOT NULL`. Enforce in the service layer (and a DB CHECK if practical).
- A GLOBAL skill is applicable to a project if it has a `ProjectSkill` row for it. A PROJECT skill is implicitly applicable only to its own project.
- `Skill.slug` unique per scope bucket: globally unique among GLOBAL skills, unique per project among PROJECT skills.
- Deleting a `Project` cascades to its PROJECT skills and removes its `ProjectSkill` attachments (but NEVER deletes GLOBAL skills).
- `Technology.slug` unique per `kind`. Deleting a `Project` removes its `ProjectTechnology` rows but NEVER deletes `Technology` lookup rows.
- **ArtifactType scope:** same GLOBAL/PROJECT rule as skills (`scope == GLOBAL` ⟺ `project_id IS NULL`). The built-in "Development Plan" type ships as a GLOBAL default (`is_default = true`) and cannot be deleted (only superseded). Users create their own types (GLOBAL or per-project). `output_files` is a manifest of `{path, note}` describing which files the AI should produce and each file's purpose.
- **Artifact vs ArtifactVersion:** an `Artifact` is a stable container of a given `ArtifactType`; content lives in append-only `ArtifactVersion` rows, each holding one or more `ArtifactFile` rows. `version_number` increments per artifact from 1. `current_version_id` points at the active version. Regeneration creates a new version (never overwrites). Reverse lookups ("artifacts from note N" / "task T") query `ArtifactVersion.source_note_ids`/`source_task_ids`.
- **ArtifactFile vs manifest:** the produced files SHOULD cover the type's `output_files` manifest; the service flags missing or extra files (warning, not hard failure) so the agent can be re-prompted.
- **ArtifactPhase:** optional execution tracking, mainly meaningful for plan-like types; parsed from a primary file's headings when applicable. Re-parsing on a new version creates a fresh phase set (old version's phases retained with it).
- **Task dependencies:** `Task.depends_on` may reference only tasks in the SAME project. Reject cycles (validate in the service layer). A task is "blocked" if any dependency is not DONE — surfaced in the API/UI, not enforced as a hard constraint.
- **Document:** `domain_id`, if set, must belong to the same project. Deleting a `Project` cascades to its documents (DB rows + stored files + Qdrant vectors). Deleting a document removes its vectors.
- **ProjectTemplate:** standalone, not tied to any project. Applying a template is a one-time materialization (a copy); later edits to the template do NOT retroactively change projects created from it.
- **Vector consistency:** creating/updating a Note or Document enqueues (re)embedding; deleting removes the corresponding Qdrant points. Postgres write is authoritative; if embedding fails it is retried, and the entity still exists without a vector (degraded search, never data loss).

---

## 2. Tech stack & repo layout

```
project-notes/
├─ backend/                 # FastAPI + SQLAlchemy + Alembic
│  ├─ app/
│  │  ├─ domain/            # entities, enums, value objects (pure, no I/O)
│  │  ├─ application/       # services / use-cases
│  │  ├─ infrastructure/    # SQLAlchemy models, repositories, session
│  │  ├─ api/               # FastAPI routers (thin)
│  │  ├─ schemas/           # Pydantic DTOs
│  │  ├─ config.py
│  │  └─ main.py
│  ├─ alembic/
│  ├─ Dockerfile
│  ├─ pyproject.toml        # use uv
│  └─ .env.example
├─ frontend/                # Next.js 15 (App Router, TS, Tailwind, shadcn, framer-motion)
│  ├─ Dockerfile
│  └─ ...
├─ mcp/                     # MCP server (Python, mcp SDK)
│  ├─ project_notes_mcp/
│  │  ├─ __main__.py
│  │  └─ server.py
│  ├─ Dockerfile
│  └─ pyproject.toml
├─ docker-compose.yml       # orchestrates all services: postgres + qdrant + backend + mcp + frontend
├─ .env.example             # shared env for compose (db creds, ports, service URLs, qdrant url)
└─ README.md
```

Layering rule (DDD/Hexagonal): `domain` depends on nothing; `application` depends on `domain` + repository interfaces; `infrastructure` implements those interfaces; `api` depends on `application`. No reverse dependencies. The vector store sits behind a repository interface too (e.g. `VectorIndex`), so embedding/search is swappable.

**Service decoupling (confirmed architecture):** independent processes communicating only over the network.
- `frontend` → `backend` over HTTP (`NEXT_PUBLIC_API_URL`).
- `mcp` → `backend` over HTTP (`BACKEND_URL`). The MCP server never imports backend code.
- `backend` → `postgres` (entities) and → `qdrant` (vectors).
- `backend` embeds with **FastEmbed** in-process (CPU); no separate embedding service needed.
Each service has its own `Dockerfile` and is a separate compose service on a shared network.

---

## PHASE 1 — Database & backend foundation

**Goal:** Postgres running, schema migrated, project bootstraps cleanly. No business logic yet.

### Tasks
1. `docker-compose.yml` with a `postgres:16` service (db: `projectnotes`, exposed `5432`, named volume, healthcheck) and a `qdrant` service (named volume, exposed port). Define a shared network now; backend/mcp/frontend get added in their phases, culminating in Phase 6 orchestration. Keep a root `.env.example` for shared compose vars.
2. `backend/pyproject.toml` via `uv`: `fastapi`, `uvicorn[standard]`, `sqlalchemy>=2`, `alembic`, `psycopg[binary]`, `pydantic-settings`, `python-slugify`, `qdrant-client`, `fastembed`. Document/text extraction: `pypdf`, `python-docx`. Dev: `pytest`, `httpx`, `ruff`.
3. `app/config.py` — `Settings` (pydantic-settings) reading `DATABASE_URL`, `QDRANT_URL`, embedding model name from `.env`. Provide `.env.example`.
4. `app/infrastructure/db.py` — engine, `SessionLocal`, `Base`, FastAPI `get_db` dependency.
5. SQLAlchemy models in `app/infrastructure/models.py` for the tables in §1: `technologies`, `projects`, `project_technologies`, `domains`, `notes`, `tasks`, `artifact_types`, `artifacts`, `artifact_versions`, `artifact_files`, `artifact_phases`, `skills`, `project_skills`, `documents`, `project_templates`. Use UUID PKs, `server_default` timestamps, proper FKs + cascade rules per the invariants. CHECK constraints on `skills` and `artifact_types` for scope↔project_id if practical. JSONB for `Project.metadata`, `ArtifactType.output_files`, `ProjectTemplate.definition`; GIN indexes on `artifact_versions.source_note_ids` / `source_task_ids` and on `tasks.depends_on`. **Full-text: `search_tsv` GENERATED `tsvector` columns on `notes` (title+content), `documents` (title+extracted_text), `artifact_files` (path+content), each with a GIN index** — this powers in-file word search.
6. Initialize Alembic; generate the first migration; confirm `alembic upgrade head` creates all tables and the GIN/full-text indexes. Seed canonical `technologies` and the built-in **"Development Plan"** `ArtifactType` (default).
7. `app/main.py` with `GET /health` returning `{"status":"ok"}`.

### Done criteria
- `docker compose up -d` → Postgres + Qdrant healthy.
- `alembic upgrade head` creates 15 tables with correct FKs/cascades and full-text GIN indexes on notes/documents/artifact_files.
- `uvicorn app.main:app` → `/health` returns 200.

**STOP. Report. Await approval.**

---

## PHASE 2 — Backend domain + application + API

**Goal:** Full CRUD over the REST API, with DDD layering and invariants enforced.

### Tasks
1. **Domain layer** (`app/domain/`): pure dataclasses/enums for `Project`, `Technology`, `Domain`, `Note`, `Task`, `ArtifactType`, `Artifact`, `ArtifactVersion`, `ArtifactFile`, `ArtifactPhase`, `Skill`, and the enums (`NoteType`, `TaskStatus`, `TaskPriority`, `ArtifactStatus`, `PhaseStatus`, `SkillScope`, `ScopeKind`, `ProjectStatus`, `TechnologyKind`). No SQLAlchemy here. (`Document`, `ProjectTemplate`, and the `VectorIndex` interface land in Phase 3.)
2. **Repository interfaces** (`app/domain/repositories.py`): `ProjectRepository`, `TechnologyRepository`, `DomainRepository`, `NoteRepository`, `TaskRepository`, `ArtifactTypeRepository`, `ArtifactRepository` (incl. version + file + phase ops), `SkillRepository`. `ProjectRepository.list` accepts filter args (search, language, framework, database, status); `TaskRepository.list` accepts filters (status, priority, domain_id, tag).
3. **Repository implementations** (`app/infrastructure/repositories.py`): SQLAlchemy-backed, mapping ORM ↔ domain objects. Implement the filtered project query with joins to `project_technologies`/`technologies` (AND semantics across filter groups).
4. **Application services** (`app/application/`): one service per aggregate. Enforce invariants (note/task domain-belongs-to-project; slug generation + collisions; skill & artifact-type scope↔project_id; attach/detach GLOBAL skills; attach/detach technologies with optional version; resolve-or-create technology by name+kind; **task `depends_on` same-project + cycle rejection + blocked-status computation; ArtifactType management with the protected built-in "Development Plan" default; artifact versioning: creating an artifact or regenerating creates a new `ArtifactVersion` with its `ArtifactFile`s, bumps `version_number`, updates `current_version_id`, validates produced files against the type's manifest, and parses phase headings into `ArtifactPhase` rows when applicable**).
5. **Pydantic schemas** (`app/schemas/`): Create / Update / Read DTOs per entity. Project Read DTO includes technologies (grouped by kind, with versions) and `note_count`/`task_count`/`artifact_count` summaries. Artifact Read DTO includes its type, current version's files, version list (numbers + dates), manifest coverage (which files present/missing), and the phase checklist with statuses.
6. **API routers** (`app/api/`), thin:
   - `/projects` — list with filters (`search`, `language`, `framework`, `database`, `status`); create, get (by slug), update, delete.
   - `/projects/{slug}/technologies` — attach (with optional version) / detach; list.
   - `/technologies` — list (filter by `kind`), create canonical entries.
   - `/projects/{slug}/domains` — list, create; `/domains/{id}` get/update/delete
   - `/projects/{slug}/notes` — list (filter by `domain_id`, `type`, `tag`), create; `/notes/{id}` get/update/delete
   - `/projects/{slug}/tasks` — list (filter by `domain_id`, `status`, `priority`, `tag`), create; `/tasks/{id}` get/update/delete (incl. status & priority change, and `depends_on` editing). List includes computed `blocked` flag.
   - `/artifact-types` — list (filter by `scope`), create/get/update/delete user types (the default cannot be deleted); each carries `instructions` + `output_files` manifest. `/projects/{slug}/artifact-types` — types applicable to a project (GLOBAL + that project's).
   - `/notes/{id}/artifacts` and `/tasks/{id}/artifacts` — artifacts generated from this note/task (reverse lookups powering previews).
   - `/projects/{slug}/artifacts` — list (filter by `artifact_type`), create; `/artifacts/{id}` get/update/delete (incl. status change).
   - `/artifacts/{id}/versions` — list versions; `GET /artifacts/{id}/versions/{n}` a specific version (with its files); `GET /artifacts/{id}/diff?from=&to=&path=` diffs a given file across two versions.
   - `/artifacts/{id}/files` — list current files; `/artifacts/{id}/phases` list phases; `PATCH /phases/{phase_id}` set status/note (UI + MCP).
   - `/artifacts/{id}/export` — download the current (or a specific) version: single file, or a zip when the manifest has multiple files.
   - `/skills` — list (filter by `scope`, `tag`), create (GLOBAL or PROJECT), get/update/delete; markdown-with-frontmatter upload or inline
   - `/skills/{id}/export` and `/projects/{slug}/export` — export a skill as `SKILL.md`, or a whole project (notes + tasks + current artifacts + skills) as a zip bundle.
   - `/projects/{slug}/skills` — list applicable; `/projects/{slug}/skills/{skill_id}` POST attach / DELETE detach a GLOBAL skill
7. CORS enabled for the frontend origin.
8. **`backend/Dockerfile`** (uv-based, runs migrations on start then `uvicorn`). Add the `backend` service to `docker-compose.yml`, depending on `postgres` (healthcheck), reading `DATABASE_URL` from compose env, exposing its port.
9. Tests: note/task domain invariant, slug collisions, note & task filtering, skill scope, attach/detach skill, project filtering by framework+language combined, technology resolve-or-create, note→artifact & task→artifact reverse lookups, **task dependency cycle rejection + blocked computation, artifact-type scope + protected default, artifact version increment + current pointer + multi-file storage + manifest coverage + phase parsing, artifact export (single + zip)**.

### Done criteria
- All endpoints work (verify with httpx/curl).
- Invariant tests green.
- Creating a note or task with a `domain_id` from another project returns 422.
- Creating a GLOBAL skill/artifact-type with a `project_id` (or a PROJECT one without) returns 422; the default artifact type cannot be deleted.
- Attaching a global skill to a project, then listing `/projects/{slug}/skills`, returns it.
- `GET /projects?framework=Next.js&language=Python&status=ACTIVE` returns only matching projects.
- `GET /projects/{slug}/tasks?status=TODO&priority=HIGH` filters correctly; a task with an unfinished dependency reports `blocked=true`.
- Creating an artifact of a custom type stores its files; regenerating creates version 2 (keeps v1); `/artifacts/{id}/diff?from=1&to=2&path=...` returns a diff; manifest coverage reports missing/extra files.
- `/artifacts/{id}/export` returns a single file or a zip per the manifest.
- `docker compose up backend` brings up backend + postgres + qdrant; migrations apply automatically; `/health` reachable.

**STOP. Report. Await approval.**

---

## PHASE 3 — Documents, search (lexical + semantic + hybrid) & project templates

**Goal:** Upload and store project documents; index notes + documents + artifact files for both **full-text (in-file word search)** and **semantic** retrieval; expose a unified search API scopable globally or per project; support user-defined reusable project templates. All behind repository interfaces; backend embeds with FastEmbed in-process.

### Tasks
1. **Vector index abstraction** (`app/domain/vector.py`): a `VectorIndex` interface (`upsert(points)`, `search(query, project_id?, domain_id?, kinds?, limit)`, `delete(ids)`). Implement with `qdrant-client` in `app/infrastructure/qdrant_index.py`. One collection, payload `{type: note|document|artifact_file, id, project_id, domain_id, title, tags}` for filtered search.
2. **Embeddings** (`app/infrastructure/embeddings.py`): wrap **FastEmbed** (configurable model, CPU). `embed_texts(list[str]) -> list[vector]`. Chunk long text before embedding (paragraph/length-based; store chunk → parent id in payload).
3. **Lexical search** (`app/infrastructure/fulltext.py`): query helpers over the `search_tsv` columns using `plainto_tsquery`/`websearch_to_tsquery`, with `ts_rank` ordering and `ts_headline` highlighted snippets. Scope by `project_id`/`domain_id`. Covers notes, documents, and artifact files (the "words inside files" requirement).
4. **Indexing hooks** in the Note service, Document service, and Artifact service: on create/update, refresh the entity (tsvector is auto-generated by Postgres) and (re)embed + upsert to Qdrant; on delete, remove vectors. Resilient indexing (retry; entity persists even if embedding fails).
5. **Document service + storage**: store uploads on a mounted volume (`storage_path`); extract text (`pypdf`, `python-docx`, plain read for md/txt); persist `Document`; index. Pluggable storage interface so object storage can replace local later.
6. **Hybrid search service**: run lexical + semantic in parallel and fuse with Reciprocal Rank Fusion; expose mode selection (`lexical` | `semantic` | `hybrid`, default hybrid).
7. **ProjectTemplate service**: create/list/update/delete; **apply** to a new/existing project (materialize domains, attach technologies/skills, optional starter notes/tasks); **save an existing project as a template** (snapshot structure into `definition`).
8. **API routers**:
   - `/projects/{slug}/documents` — upload (multipart), list (filter by `domain_id`, `tag`), get metadata, download original, delete; `/documents/{id}` get/delete.
   - `/search` — unified search: `q`, `mode` (lexical|semantic|hybrid), optional `project_slug`/`domain_slug`/`kinds` (note|document|artifact_file), `tags`. Returns ranked hits with **highlighted snippets** + source links (project, type, id, file path). `/projects/{slug}/search` is the scoped variant.
   - `/files` — **File explorer API**: list saved files (artifact files + documents) grouped/filterable by **project**, type, tag, with a text query that runs full-text *inside* file contents; returns file metadata + matched snippet + a link to open the file. `/projects/{slug}/files` scoped variant.
   - `/templates` — CRUD; `POST /projects` accepts optional `template_slug`; `POST /projects/{slug}/save-as-template`.
9. **Reindex utility**: endpoint/CLI to rebuild the Qdrant collection from Postgres (full-text indexes are maintained automatically by Postgres).
10. Tests: document upload + extraction + dual indexing; **lexical search finds an exact word inside an artifact file and a document, scoped by project**; semantic search finds by meaning; hybrid fuses; file-explorer listing groups by project and filters by query; template apply + save-as-template round-trip; reindex repopulates.

### Done criteria
- `docker compose up -d` includes a healthy `qdrant`; backend connects.
- Uploading a PDF/docx/md creates a `Document`, extracts text, indexes it both ways.
- `/search?q=...&mode=lexical` finds exact words inside files; `mode=semantic` finds by meaning; `mode=hybrid` returns fused results — all scopable by project.
- `/files?project=...&q=...` returns the matching files with highlighted snippets, grouped by project.
- Creating/updating/deleting notes/documents/artifacts keeps both indexes consistent.
- Templates apply and round-trip; reindex rebuilds the vector collection.

**STOP. Report. Await approval.**

---

## PHASE 4 — MCP server

**Goal:** The AI (Claude Code) can discover projects, pull structured context, choose an artifact type, and write typed artifacts back — all via MCP.

### Tasks
1. `mcp/pyproject.toml`: `mcp`, `httpx`. The MCP server talks to the FastAPI backend over HTTP (do NOT import the backend directly — keep them decoupled). Read `BACKEND_URL` from env.
2. `server.py` using `FastMCP("project-notes")`. Implement these tools (typed, with clear docstrings — the docstrings are the agent's instructions):

   **Read tools**
   - `list_projects() -> list[dict]` — id, name, slug, tech_stack.
   - `list_domains(project_slug) -> list[dict]` — bounded contexts of a project.
   - `get_project_context(project_slug, domain_slug: str | None = None) -> str`
     The key tool. Fetches **notes and tasks** (optionally scoped to one domain) and returns **pre-assembled markdown**: notes grouped by domain then type (with ubiquitous-language tables), followed by a tasks section grouped by status/priority **and ordered respecting `depends_on`**, a list of available documents, plus a section listing applicable skills. This is the full picture the agent uses to build an artifact.
   - `list_artifact_types(project_slug: str | None = None) -> list[dict]` — available output types (the default "Development Plan" + user-defined), each with description and its `output_files` manifest.
   - `get_artifact_type(type_slug, project_slug: str | None = None) -> dict` — the type's full `instructions` + file manifest (path + per-file note). This tells the agent EXACTLY what to produce and which files.
   - `list_artifacts(project_slug, artifact_type: str | None = None) -> list[dict]` and `get_artifact(artifact_id) -> dict` — existing artifacts (with current files).
   - `list_tasks(project_slug, status: str | None = None, priority: str | None = None) -> list[dict]` — work items, filterable.
   - `get_task(task_id) -> dict` / `get_note(note_id) -> dict` — single items.
   - `get_project_skills(project_slug) -> list[dict]` and `get_skill(skill_slug, project_slug: str | None = None) -> str` — applicable skills + full bodies.
   - `search_knowledge(query, mode: str = "hybrid", project_slug: str | None = None, domain_slug: str | None = None, kinds: list[str] | None = None) -> list[dict]` — search over notes + documents + artifact files. `mode` is `lexical` (exact words inside files), `semantic` (by meaning, via Qdrant), or `hybrid` (fused). Returns ranked hits with highlighted snippets + source refs. Lets the agent pull only relevant material on large projects.
   - `list_documents(project_slug) -> list[dict]` and `get_document(document_id) -> dict` — uploaded reference material (metadata + extracted text).
   - `list_artifact_versions(artifact_id) -> list[dict]` and `get_artifact_version(artifact_id, version_number) -> dict` — version history (files) for diffing/iterating.
   - `prepare_generation(project_slug, artifact_type_slug, domain_slug: str | None = None, note_ids: list[str] | None = None, task_ids: list[str] | None = None) -> str`
     **The unified generation bundle.** Assembles in one payload: the chosen type's `instructions` + `output_files` manifest, the relevant context (all notes+tasks for a complete build, or just the given note_ids/task_ids for a focused one, dependency-ordered), applicable skills, and available documents. The agent reads this and produces the declared files. Replaces the old per-shape generators with one type-aware tool.

   **Write tools**
   - `save_artifact(project_slug, artifact_type_slug, title, files: list[{path, content, note?}], domain_slug: str | None = None, source_note_ids: list[str] | None = None, source_task_ids: list[str] | None = None, source_document_ids: list[str] | None = None) -> dict`
     Persists a typed artifact. If one with the same title/slug exists, creates a NEW version (keeps history); else creates artifact + version 1. Validates `files` against the type's manifest (warns on missing/extra). Parses phases from a primary file when applicable. Pass source ids so it links back for UI previews.
   - `update_phase_status(artifact_id, phase_id, status, note: str | None = None) -> dict` — lets the agent mark execution phases PENDING/IN_PROGRESS/DONE **as it implements them**, turning a plan-like artifact into a live tracker visible in the UI.

3. `__main__.py` supports **two transports**: stdio (default, for local Claude Code) and HTTP/SSE (for running as a containerized service). Select via env (`MCP_TRANSPORT=stdio|sse`, `MCP_HOST`, `MCP_PORT`).
4. **`mcp/Dockerfile`** (uv-based). Add the `mcp` service to `docker-compose.yml`, depending on `backend`, reading `BACKEND_URL` (the in-network backend URL) and `MCP_TRANSPORT=sse` so it runs as a reachable service in compose. For local Claude Code use, stdio on the host is simplest; the SSE container is for an always-on/shared deployment.
5. Provide both `.mcp.json` snippets for Claude Code registration: a **stdio** variant and an **SSE/url** variant. Document when to use which.

### Workflow this enables
> **Pick the output type:** `list_artifact_types(X)` → choose "Development Plan" (default) or a user type like "Research Synthesis" / "Copy Brief".
> **Generate a complete typed artifact:** `prepare_generation(X, "development-plan")` (all notes+tasks+docs+skills+type manifest) → agent produces the declared files → `save_artifact(X, "development-plan", title, files=[...])`.
> **Focused generation:** `prepare_generation(X, "copy-brief", note_ids=[N])` → produce just that type's files from one note.
> **Targeted retrieval on big projects:** `search_knowledge(...)` first, then generate.
> **Iterate:** regenerate → `save_artifact` (same title) creates version N+1; diff via `get_artifact_version`.
> **Live execution (plan-like types):** `update_phase_status` as work proceeds.
> Each type declares its files, so the AI delivers a structured set of outputs (code, copy, analysis, research) — "all in one go" — instead of free-form text.

### Done criteria
- MCP server starts; tools are discoverable.
- `list_artifact_types`/`get_artifact_type` expose the default + user types with their file manifests.
- `get_project_context` returns grouped markdown (notes, dependency-ordered tasks, documents, skills).
- `prepare_generation` returns a type-aware bundle; `save_artifact` stores the declared files and validates manifest coverage.
- `save_artifact` on an existing title creates a new version; `list_artifact_versions`/`get_artifact_version` expose history.
- `search_knowledge` returns relevant notes/documents/artifact files; lexical mode matches exact words inside files, semantic by meaning, hybrid fuses; `list_documents`/`get_document` expose material.
- `update_phase_status` flips a phase, visible via the backend.
- artifacts link back via `/notes/{N}/artifacts` and `/tasks/{T}/artifacts`.
- `.mcp.json` snippets (stdio + SSE) documented; `docker compose up mcp` runs SSE mode talking to the backend container.

**STOP. Report. Await approval.**

---

## PHASE 5 — Next.js frontend

**Goal:** Fast capture and browsing UI, including skill management. Capture speed > visual polish, but use a clean component system.

### Tasks
1. Scaffold Next.js 15 (App Router, TypeScript, Tailwind). Initialize **shadcn/ui** (`npx shadcn@latest init`) and add the components used below (`button`, `input`, `textarea`, `select`, `command`/combobox, `dialog`, `card`, `badge`, `tabs`, `dropdown-menu`, `sonner` for toasts, `switch`, `separator`, `scroll-area`, `checkbox`, `progress`, `accordion`). Install **framer-motion**. For diffs, a lightweight markdown-diff renderer.
2. Typed API client in `lib/api.ts`; use SWR for data fetching (matches existing convention). `NEXT_PUBLIC_API_URL` in env.
3. **Animation conventions (framer-motion):** wrap list items in a shared `AnimatedList`/`motion.div` with subtle stagger (fade + slide-up, ~150–200ms); animate `Dialog` content with scale/opacity; use `AnimatePresence` for note/skill add/remove and route-level transitions. Keep it tasteful — no bouncy distractions on a capture tool.
4. Pages:
   - `/` — **Dashboard.** Project cards in an animated grid, each showing name, status badge, and technology badges (language/framework/database) + note/plan counts. **Filter bar** above the grid: a search `Input` (debounced, filters name/description) plus `Select`/combobox filters for language, framework, database, and status — options populated from `/technologies`. Filters combine (AND) and drive `GET /projects?...`. Empty/loading states.
   - `/projects/[slug]` — project overview: editable metadata panel (status, repo URL, technologies with versions via a tech picker, free-form metadata), bounded contexts (domains), and shadcn `Tabs` for Notes / Tasks / Artifacts / Documents / Skills. A global **search box** (calls `/search`) with a **mode toggle** (exact words / by meaning / hybrid) surfaces matching notes/documents/artifact files across the project, with highlighted snippets.
   - **`/files` — File Explorer.** A dedicated page to browse all saved files (artifact files + documents) **grouped by project** (collapsible sections, or a project selector for scoping). A prominent **search input runs full-text inside file contents** (mode toggle: exact / semantic / hybrid), plus filters by type and tag. Results show file path/title, project, the matched snippet (highlighted), and open the file in a viewer. This is the "explore saved files by project category with in-file search" surface.
   - **Tasks tab** — list (or simple board grouped by status: Todo / In Progress / Done) with priority badges; create/edit task in a `Dialog` (title, markdown description, status, priority, tags, optional domain, **dependencies via a task multi-select**); inline status/priority change with optimistic update + `sonner` toast; filter by status/priority/tag. Blocked tasks (unfinished dependency) get a visual `Badge`. Animate status moves with framer-motion `layout` transitions.
   - **Documents tab** — drag-and-drop upload (PDF/docx/md/txt) with progress; list with type/size/indexed badges; preview extracted text; download original; delete. Indexed state shown once vectorized.
   - `/projects/[slug]/domains/[domainSlug]` — notes and tasks for that bounded context, filterable.
   - **Item → artifact preview** (within the project view): clicking a note OR a task opens a **two-pane preview** — left pane renders the item, right pane lists associated artifacts (from `/notes/{id}/artifacts` or `/tasks/{id}/artifacts`); selecting one shows its files. If none exists, an empty state offers **"Generate from this"** with an artifact-type picker, surfacing the copyable MCP instruction. Animate the pane reveal.
   - **Generate controls** — on the project view, a primary **"Generate"** action with an **artifact-type picker** (default "Development Plan" + user types), choosing scope (complete = all notes+tasks, or selected items). Each surfaces the exact MCP instruction / prompt to run in Claude Code; the artifacts list and previews refresh once the agent saves.
   - **Artifacts tab** — list artifacts grouped by type; artifact detail shows the **file set** of the current version (tabbed/accordion per file, with the per-file manifest note), **manifest coverage** indicator (which declared files are present/missing), a **version switcher** with per-file **diff view**, an optional **execution checklist** (phases, also updated live by the agent via MCP) for plan-like types, status toggle DRAFT/APPROVED/ARCHIVED, **export** (single file or zip), and links back to source notes/tasks.
   - **Artifact types** — a `/artifact-types` library to create/edit/delete user types: name, description, generation **instructions** (markdown), and a **file manifest editor** (rows of path + note). The built-in "Development Plan" is shown read-only as the default. Per-project types managed from the project view too.
   - **Templates** — a `/templates` library to create/edit/delete user templates; "New project from template" in the create-project flow; "Save as template" action on a project. Animate template cards.
   - `/projects/[slug]/skills` — applicable skills (PROJECT + attached GLOBAL) with scope `Badge`; attach/detach GLOBAL skills via picker `Dialog`; create PROJECT skill inline.
   - `/skills` — global skill library: list, create, edit, delete GLOBAL skills.
5. **Quick-note composer** component: type `Select` (Requirement/Constraint/Decision/Question/Snippet/Reference), optional title, markdown `Textarea`, tags, target domain (or project-level). Optimistic create via SWR mutate + `sonner` toast.
6. **Skill upload component:** drag-and-drop or file picker for a `.md` file with frontmatter (parse `name`, `description`, `scope` client-side; let user confirm scope and, if GLOBAL, optionally attach to current project). Also support inline create/edit in a `Dialog` with markdown `Textarea`. Animate the upload/confirm flow with `AnimatePresence`.
7. Markdown/code rendering for note/artifact-file/skill view (e.g. `react-markdown` + a syntax highlighter; render non-markdown files like `.py`/`.csv` appropriately).
8. Responsive layout so capture works from mobile browser.
9. **`frontend/Dockerfile`** (multi-stage Next.js build, `output: 'standalone'`). Add the `frontend` service to `docker-compose.yml`, depending on `backend`, with `NEXT_PUBLIC_API_URL` pointing at the backend (build-time/public env handled correctly).

### Done criteria
- Dashboard filters work: search + language/framework/database/status narrow the project grid via the API.
- Project view shows metadata and tabs for Notes/Tasks/Artifacts/Documents/Skills; search with mode toggle returns matching notes/documents/artifact files with highlighted snippets.
- The File Explorer page lists saved files grouped by project, and a query finds words **inside** file contents (exact mode), by meaning (semantic), or fused (hybrid), with highlighted snippets and a file viewer.
- Tasks support dependencies and show a blocked badge when a dependency is unfinished.
- Documents upload, show indexed state, and are findable via search.
- A user can define a custom artifact type with instructions + a file manifest; the default "Development Plan" exists and is non-deletable.
- Generating with a chosen type produces a multi-file artifact; the artifact detail shows files, manifest coverage, versions with per-file diff, and (for plan-like types) an execution checklist reflecting MCP updates; export yields single file or zip.
- Templates can be created, applied to a new project, and saved from an existing project.
- Clicking a note or task opens the two-pane preview; associated artifacts render alongside or the "generate from this" affordance shows the type picker + copyable MCP instruction.
- Full loop: create project (optionally from template) → set metadata → add notes + tasks (+deps) + documents → create/attach skills → define/choose an artifact type → (in Claude Code) generate a typed artifact → iterate to v2 → (for plans) mark phases done as implemented → mark APPROVED → export files.
- shadcn + framer-motion render correctly; no layout shift on animated lists/boards.

**STOP. Report. Await approval.**

---

## PHASE 6 — Full stack orchestration (docker-compose assembly)

**Goal:** One command brings up the whole decoupled system; verify the services talk to each other only over the network.

### Tasks
1. Finalize `docker-compose.yml` with all services on a shared network: `postgres`, `qdrant`, `backend`, `mcp`, `frontend`. Use `depends_on` with healthchecks (postgres + qdrant healthy → backend; backend healthy → mcp + frontend). Services reference each other by compose service name (e.g. backend at `http://backend:8000`, qdrant at `http://qdrant:6333`).
2. Add a `backend` healthcheck hitting `/health`; gate dependents on it.
3. Root `.env.example` documenting every variable: DB creds, `DATABASE_URL`, `QDRANT_URL`, embedding model, `BACKEND_URL` (for mcp), `NEXT_PUBLIC_API_URL` (for frontend), `MCP_TRANSPORT`, ports. Sensible localhost defaults. Named volumes for postgres, qdrant, and document storage.
4. Ensure backend container runs `alembic upgrade head` (and optional seed) on startup before serving.
5. Confirm there are **no in-process imports across services** — each Dockerfile builds only its own service's code.
6. README "Run everything" section: `docker compose up --build`, the resulting URLs (frontend, backend docs, mcp, qdrant dashboard), and how to register the MCP server with Claude Code in both stdio and SSE modes.

### Done criteria
- `docker compose up --build` brings up all services; postgres migrates, qdrant ready, backend serves, mcp connects to backend, frontend loads and lists projects.
- Killing/restarting any single service does not require rebuilding the others (decoupling holds).
- End-to-end against the composed stack: create project + notes + tasks + a document in the UI → semantic search finds the document → choose an artifact type and generate via MCP from Claude Code → the typed artifact (files, and phases for plan-like types) appears in the UI.

**STOP. Report. Await approval.**

---

## PHASE 7 — Polish & DX (optional, only if requested)

- Seed script with canonical technologies, the default "Development Plan" artifact type + one extra sample type (e.g. "Research Synthesis"), one sample DDD project (2 domains, tech metadata, mixed notes, tasks with deps, a document), one GLOBAL skill, one PROJECT skill attached, and one sample template.
- README: deeper run/troubleshooting notes; embedding-model selection guidance.
- Reindex CLI/endpoint surfaced in the UI (admin action).
- Auth — only if the app leaves localhost.

---

## Cross-cutting rules
- **Decoupling:** MCP ↔ backend over HTTP only. Frontend ↔ backend over HTTP only. Backend owns both Postgres (entities) and Qdrant (vectors) behind repository interfaces. No shared in-process imports across the three deliverables.
- **Source of truth:** Postgres is authoritative for all entities; Qdrant holds only derived vectors and is rebuildable via reindex.
- **Search:** two engines, complementary — Postgres full-text (`tsvector`/GIN) for exact words inside files/notes, Qdrant for semantic; a hybrid endpoint fuses them. Both scope by project/domain.
- **Migrations:** every schema change = a new Alembic migration. Never edit applied migrations.
- **No premature abstraction:** add repository methods/endpoints when a phase needs them, not before.
- **Reporting:** at each STOP, list files created/changed, how to run/verify, and any decisions that need confirmation.
