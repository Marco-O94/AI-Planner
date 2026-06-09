# Configurable Note Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed `note_type` Postgres enum with a configurable `note_types` catalog (GLOBAL + per-project), and add a project Settings page to add/edit/delete note types.

**Architecture:** Mirror the existing `artifact_types` vertical slice end-to-end (DB model → Alembic migration → domain entity/repository → infra repo/mapper → application service → DTO schema → FastAPI router → deps wiring), then the frontend `artifact-types` components (view/dialog/delete-dialog/picker). Notes reference a type by FK (`note_type_id`, `ondelete RESTRICT`); the notes API keeps accepting the type as a **string** (key or slug) so the MCP and existing clients need no change.

**Tech Stack:** FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2 · pytest · Next.js (App Router) · SWR · TypeScript · Tailwind · Radix UI.

**Spec:** `docs/superpowers/specs/2026-06-09-configurable-note-types-design.md`

**Working dir note:** backend commands run from `backend/`; frontend commands from `frontend/`. The pytest suite applies real Alembic migrations against the configured DB (`tests/conftest.py`), so a running/configured Postgres is required (same as existing tests).

---

## Color palette (single source of truth)

The 7 allowed tone names, used by both backend validation and frontend:
`violet`, `blue`, `green`, `amber`, `red`, `slate`, `neutral`.

Built-in seed colors (preserve today's look):
`REQUIREMENT→violet`, `CONSTRAINT→red`, `DECISION→green`, `QUESTION→amber`, `SNIPPET→blue`, `REFERENCE→slate`.

---

## File Structure

**Backend**
- Modify `app/domain/enums.py` — add `NOTE_TYPE_COLORS` palette + keep `NoteType` StrEnum as the built-in key list.
- Modify `app/domain/entities.py` — add `NoteTypeRef` + `NoteTypeEntity`; change `Note.type` → `Note.note_type_id` + `Note.type: NoteTypeRef | None`.
- Modify `app/domain/repositories.py` — add `NoteTypeRepository`; change `NoteRepository.list` filter to `note_type_id`.
- Modify `app/infrastructure/models.py` — add `NoteType` ORM model; change `Note.type` column → `note_type_id` FK + relationship.
- Modify `app/infrastructure/mappers.py` — `note_to_domain` builds the `type` ref; add `note_type_to_domain`.
- Modify `app/infrastructure/repositories.py` — add `SqlNoteTypeRepository`; update `SqlNoteRepository`.
- Create `app/schemas/note_type.py` — `NoteTypeCreate/Update/Read`.
- Modify `app/schemas/note.py` — `type: str` on write, nested `type` summary on read.
- Create `app/application/note_type_service.py` — CRUD + color validation.
- Modify `app/application/note_service.py` — resolve type string → `note_type_id`.
- Create `app/api/routers/note_types.py` — `/note-types` + `/projects/{slug}/note-types`.
- Modify `app/api/routers/notes.py` — `type` query filter becomes `str`.
- Modify `app/api/deps.py` — wire `SqlNoteTypeRepository` into `NoteService`; add `get_note_type_service`.
- Modify `app/main.py` — register the `note_types` router.
- Create `alembic/versions/<gen>_configurable_note_types.py` — migration.
- Tests: `tests/test_note_types_api.py` (new), extend `tests/test_notes_tasks_api.py`.

**Frontend**
- Modify `src/lib/types.ts` — `NoteTypeColor`, `NOTE_TYPE_COLORS`, `NoteTypeRead/Create/Update`, `NoteTypeRef`, `NoteRead.type` ref.
- Modify `src/lib/api.ts` — note-type CRUD + project list.
- Modify `src/components/status-badge.tsx` — `NoteTypeBadge` takes a type ref.
- Create `src/components/notes/note-type-picker.tsx` — SWR picker.
- Modify `src/components/notes/note-form-fields.tsx` — use the picker; value = slug string.
- Modify `src/components/notes/quick-note-composer.tsx` — default type from applicable list; send slug.
- Modify `src/components/notes/note-edit-dialog.tsx` — send slug.
- Modify `src/components/project/tabs/notes-tab.tsx` — dynamic grouping/counts by type slug.
- Modify `src/components/notes/notes-filter-bar.tsx` — dynamic chips.
- Modify `src/components/notes/note-card.tsx` — badge from `note.type`.
- Create `src/components/note-types/note-type-dialog.tsx`, `delete-note-type-dialog.tsx`, `note-types-manager.tsx`.
- Create `src/app/projects/[slug]/settings/page.tsx` + entry point on project page.
- Create `src/i18n/locales/{it,en}/noteTypes.ts` + `settings.ts`; register in locale index; keep `enums.noteType.*`.

---

## PHASE A — Backend data model + migration

### Task 1: ORM model + palette constant

**Files:**
- Modify: `backend/app/domain/enums.py`
- Modify: `backend/app/infrastructure/models.py`

- [ ] **Step 1: Add the palette constant to `enums.py`**

Append to `backend/app/domain/enums.py` (after the existing `NoteType` class):

```python
# Allowed badge tones for a note type's color (mirrors the frontend palette).
NOTE_TYPE_COLORS: frozenset[str] = frozenset(
    {"violet", "blue", "green", "amber", "red", "slate", "neutral"}
)

# Built-in note types seeded as GLOBAL defaults: key -> (label, slug, color).
NOTE_TYPE_DEFAULTS: tuple[tuple[str, str, str, str], ...] = (
    ("REQUIREMENT", "Requirement", "requirement", "violet"),
    ("CONSTRAINT", "Constraint", "constraint", "red"),
    ("DECISION", "Decision", "decision", "green"),
    ("QUESTION", "Question", "question", "amber"),
    ("SNIPPET", "Snippet", "snippet", "blue"),
    ("REFERENCE", "Reference", "reference", "slate"),
)
```

- [ ] **Step 2: Add the `NoteType` ORM model + change the `Note` model**

In `backend/app/infrastructure/models.py`:

1. Ensure `relationship` is imported from `sqlalchemy.orm` (check the existing import line; add `relationship` if missing).
2. Add a new model (place it just above `class Note`):

```python
class NoteType(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "note_types"
    __table_args__ = (
        CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_note_types_scope_project",
        ),
        Index(
            "uq_note_types_global_slug",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NULL"),
        ),
        Index(
            "uq_note_types_project_slug",
            "project_id",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NOT NULL"),
        ),
    )

    scope: Mapped[ScopeKind] = mapped_column(_pg_enum(ScopeKind, "scope_kind"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    key: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))
```

3. Change the `Note` model: replace the line
```python
    type: Mapped[NoteType] = mapped_column(_pg_enum(NoteType, "note_type"), nullable=False)
```
with
```python
    note_type_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("note_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    note_type: Mapped["NoteType"] = relationship("NoteType", lazy="joined")
```

4. In the `from app.domain.enums import (...)` block at the top, the name `NoteType` now refers to BOTH the StrEnum and this ORM class. Rename the imported enum to avoid the clash: change the import to `NoteType as NoteTypeEnum` and update any remaining `_pg_enum(NoteType, ...)` / `NoteType` enum references in this file to `NoteTypeEnum` (there are none left for notes after step 3 — verify with grep).

- [ ] **Step 3: Verify the model imports cleanly**

Run: `cd backend && python -c "from app.infrastructure import models"`
Expected: no output, exit 0 (no `ImportError` / `InvalidRequestError`).

- [ ] **Step 4: Commit**

```bash
git add backend/app/domain/enums.py backend/app/infrastructure/models.py
git commit -m "feat: add note_types ORM model and color palette"
```

---

### Task 2: Alembic migration (create + seed + backfill + swap)

**Files:**
- Create: `backend/alembic/versions/<generated>_configurable_note_types.py`

- [ ] **Step 1: Generate an empty migration file**

Run: `cd backend && alembic revision -m "configurable note types"`
Expected: prints `Generating .../alembic/versions/<rev>_configurable_note_types.py ... done`. Open that file; confirm `down_revision` is set to the current head (`'2a71b265792c'`).

- [ ] **Step 2: Fill in `upgrade()` / `downgrade()`**

Replace the generated `upgrade`/`downgrade` bodies with:

```python
import uuid

import sqlalchemy as sa
from alembic import op

# (keep the generated revision / down_revision / branch_labels / depends_on lines)

_DEFAULTS = (
    ("REQUIREMENT", "Requirement", "requirement", "violet"),
    ("CONSTRAINT", "Constraint", "constraint", "red"),
    ("DECISION", "Decision", "decision", "green"),
    ("QUESTION", "Question", "question", "amber"),
    ("SNIPPET", "Snippet", "snippet", "blue"),
    ("REFERENCE", "Reference", "reference", "slate"),
)


def upgrade() -> None:
    # 1. note_types table
    op.create_table(
        "note_types",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "scope",
            sa.Enum("GLOBAL", "PROJECT", name="scope_kind", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("key", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_note_types_scope_project",
        ),
    )
    op.create_index(
        "uq_note_types_global_slug", "note_types", ["slug"],
        unique=True, postgresql_where=sa.text("project_id IS NULL"),
    )
    op.create_index(
        "uq_note_types_project_slug", "note_types", ["project_id", "slug"],
        unique=True, postgresql_where=sa.text("project_id IS NOT NULL"),
    )

    # 2. seed the 6 GLOBAL defaults
    note_types = sa.table(
        "note_types",
        sa.column("id", sa.UUID(as_uuid=True)),
        sa.column("scope", sa.String()),
        sa.column("key", sa.String()),
        sa.column("name", sa.String()),
        sa.column("slug", sa.String()),
        sa.column("color", sa.String()),
        sa.column("is_default", sa.Boolean()),
    )
    op.bulk_insert(
        note_types,
        [
            {
                "id": uuid.uuid4(), "scope": "GLOBAL", "key": key,
                "name": name, "slug": slug, "color": color, "is_default": True,
            }
            for key, name, slug, color in _DEFAULTS
        ],
    )

    # 3. add nullable note_type_id
    op.add_column("notes", sa.Column("note_type_id", sa.UUID(as_uuid=True), nullable=True))

    # 4. backfill from the old enum value (matches default key)
    op.execute(
        """
        UPDATE notes
        SET note_type_id = nt.id
        FROM note_types nt
        WHERE nt.scope = 'GLOBAL' AND nt.key = notes.type::text
        """
    )

    # 5. enforce NOT NULL + FK (RESTRICT)
    op.alter_column("notes", "note_type_id", nullable=False)
    op.create_foreign_key(
        "fk_notes_note_type_id", "notes", "note_types",
        ["note_type_id"], ["id"], ondelete="RESTRICT",
    )

    # 6. drop old column + enum type
    op.drop_column("notes", "type")
    op.execute("DROP TYPE note_type")


def downgrade() -> None:
    note_type_enum = sa.Enum(
        "REQUIREMENT", "CONSTRAINT", "DECISION", "QUESTION", "SNIPPET", "REFERENCE",
        name="note_type",
    )
    note_type_enum.create(op.get_bind(), checkfirst=True)
    op.add_column("notes", sa.Column("type", note_type_enum, nullable=True))
    op.execute(
        """
        UPDATE notes
        SET type = nt.key::note_type
        FROM note_types nt
        WHERE nt.id = notes.note_type_id
        """
    )
    op.alter_column("notes", "type", nullable=False)
    op.drop_constraint("fk_notes_note_type_id", "notes", type_="foreignkey")
    op.drop_column("notes", "note_type_id")
    op.drop_index("uq_note_types_project_slug", table_name="note_types")
    op.drop_index("uq_note_types_global_slug", table_name="note_types")
    op.drop_table("note_types")
```

- [ ] **Step 3: Apply + verify the migration round-trips**

Run:
```bash
cd backend && alembic upgrade head && alembic downgrade -1 && alembic upgrade head
```
Expected: each command exits 0; no errors. (Down then up proves the downgrade is correct.)

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat: migrate notes.type enum to note_types catalog"
```

---

## PHASE B — Backend domain + infrastructure

### Task 3: Domain entities + repository protocol

**Files:**
- Modify: `backend/app/domain/entities.py`
- Modify: `backend/app/domain/repositories.py`

- [ ] **Step 1: Add entities + change `Note`**

In `backend/app/domain/entities.py`:

1. Add two dataclasses (place near `Note`):

```python
@dataclass(frozen=True, slots=True)
class NoteTypeRef:
    """Compact note-type summary embedded in a Note read."""

    id: uuid.UUID
    key: str | None
    slug: str
    name: str
    color: str


@dataclass(frozen=True, slots=True)
class NoteTypeEntity:
    id: uuid.UUID
    scope: ScopeKind
    name: str
    slug: str
    color: str
    project_id: uuid.UUID | None = None
    key: str | None = None
    description: str | None = None
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
```

2. Change the `Note` dataclass: replace `type: NoteType` with:

```python
    note_type_id: uuid.UUID
    type: NoteTypeRef | None = None
```

   Keep field ordering valid for the frozen dataclass: non-default fields (`note_type_id`) must precede default ones. Final `Note` field order:
   `id, project_id, note_type_id, content, domain_id=None, title=None, tags=[], type=None, created_at=None, updated_at=None`.

3. Remove the now-unused `NoteType` import if `entities.py` imported it; `ScopeKind` is already imported (used by `ArtifactType`).

- [ ] **Step 2: Add the repository protocol + change the note list filter**

In `backend/app/domain/repositories.py`:

1. Change `NoteRepository.list` signature — replace `type: NoteType | None = None` with `note_type_id: uuid.UUID | None = None`. Remove the `NoteType` import if it becomes unused (check `TaskRepository` etc. first).

2. Add a new protocol (place near `ArtifactTypeRepository`):

```python
class NoteTypeRepository(Protocol):
    def add(self, note_type: NoteTypeEntity) -> NoteTypeEntity: ...
    def get_by_id(self, type_id: uuid.UUID) -> NoteTypeEntity | None: ...
    def get_by_slug(self, slug: str, project_id: uuid.UUID | None) -> NoteTypeEntity | None: ...
    def resolve(self, value: str, project_id: uuid.UUID) -> NoteTypeEntity | None: ...
    def list(self, *, scope: ScopeKind | None = None) -> list[NoteTypeEntity]: ...
    def list_applicable(self, project_id: uuid.UUID) -> list[NoteTypeEntity]: ...
    def update(self, note_type: NoteTypeEntity) -> NoteTypeEntity: ...
    def delete(self, type_id: uuid.UUID) -> None: ...
    def slug_exists(self, slug: str, project_id: uuid.UUID | None) -> bool: ...
```

   Add `NoteTypeEntity` to the `from app.domain.entities import (...)` block.

- [ ] **Step 3: Verify import**

Run: `cd backend && python -c "from app.domain import entities, repositories"`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/app/domain/entities.py backend/app/domain/repositories.py
git commit -m "feat: note type domain entity and repository protocol"
```

---

### Task 4: Mappers + SQL repositories

**Files:**
- Modify: `backend/app/infrastructure/mappers.py`
- Modify: `backend/app/infrastructure/repositories.py`

- [ ] **Step 1: Mappers**

In `backend/app/infrastructure/mappers.py`:

1. Replace `note_to_domain` with:

```python
def note_to_domain(o: m.Note) -> e.Note:
    return e.Note(
        id=o.id,
        project_id=o.project_id,
        note_type_id=o.note_type_id,
        domain_id=o.domain_id,
        title=o.title,
        content=o.content,
        tags=list(o.tags or []),
        type=note_type_ref(o.note_type) if o.note_type is not None else None,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def note_type_ref(o: m.NoteType) -> e.NoteTypeRef:
    return e.NoteTypeRef(id=o.id, key=o.key, slug=o.slug, name=o.name, color=o.color)


def note_type_to_domain(o: m.NoteType) -> e.NoteTypeEntity:
    return e.NoteTypeEntity(
        id=o.id,
        scope=o.scope,
        project_id=o.project_id,
        key=o.key,
        name=o.name,
        slug=o.slug,
        color=o.color,
        description=o.description,
        is_default=o.is_default,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )
```

   Ensure `e` (entities) exposes `NoteTypeRef`, `NoteTypeEntity` (they do after Task 3).

- [ ] **Step 2: `SqlNoteRepository` updates**

In `backend/app/infrastructure/repositories.py`, update `SqlNoteRepository`:

1. `add` — build the ORM with `note_type_id=note.note_type_id` instead of `type=note.type`.
2. `update` — replace `orm.type = note.type` with `orm.note_type_id = note.note_type_id`.
3. `list` — change the signature param `type: NoteType | None = None` to `note_type_id: uuid.UUID | None = None`, and the filter from `m.Note.type == type` to `m.Note.note_type_id == note_type_id`.

Full replacement for the three affected methods:

```python
    def add(self, note: e.Note) -> e.Note:
        orm = m.Note(
            id=note.id,
            project_id=note.project_id,
            domain_id=note.domain_id,
            note_type_id=note.note_type_id,
            title=note.title,
            content=note.content,
            tags=note.tags,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.note_to_domain(orm)

    def update(self, note: e.Note) -> e.Note:
        orm = self.db.get(m.Note, note.id)
        if orm is None:
            raise NotFoundError("note not found")
        orm.domain_id = note.domain_id
        orm.note_type_id = note.note_type_id
        orm.title = note.title
        orm.content = note.content
        orm.tags = note.tags
        self.db.flush()
        self.db.refresh(orm)
        return mappers.note_to_domain(orm)

    def list(
        self,
        project_id: uuid.UUID,
        *,
        domain_id: uuid.UUID | None = None,
        note_type_id: uuid.UUID | None = None,
        tag: str | None = None,
    ) -> list[e.Note]:
        stmt = select(m.Note).where(m.Note.project_id == project_id)
        if domain_id is not None:
            stmt = stmt.where(m.Note.domain_id == domain_id)
        if note_type_id is not None:
            stmt = stmt.where(m.Note.note_type_id == note_type_id)
        if tag is not None:
            stmt = stmt.where(m.Note.tags.any(tag))
        stmt = stmt.order_by(m.Note.created_at.desc())
        return [mappers.note_to_domain(o) for o in self.db.scalars(stmt).all()]
```

   Remove the now-unused `NoteType` import from this file if present.

3. Add `SqlNoteTypeRepository` (place near `SqlArtifactTypeRepository`):

```python
class SqlNoteTypeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, note_type: e.NoteTypeEntity) -> e.NoteTypeEntity:
        orm = m.NoteType(
            id=note_type.id,
            scope=note_type.scope,
            project_id=note_type.project_id,
            key=note_type.key,
            name=note_type.name,
            slug=note_type.slug,
            color=note_type.color,
            description=note_type.description,
            is_default=note_type.is_default,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.note_type_to_domain(orm)

    def get_by_id(self, type_id: uuid.UUID) -> e.NoteTypeEntity | None:
        orm = self.db.get(m.NoteType, type_id)
        return mappers.note_type_to_domain(orm) if orm else None

    def get_by_slug(self, slug: str, project_id: uuid.UUID | None) -> e.NoteTypeEntity | None:
        stmt = select(m.NoteType).where(m.NoteType.slug == slug)
        stmt = stmt.where(
            m.NoteType.project_id == project_id
            if project_id is not None
            else m.NoteType.project_id.is_(None)
        )
        orm = self.db.scalar(stmt)
        return mappers.note_type_to_domain(orm) if orm else None

    def resolve(self, value: str, project_id: uuid.UUID) -> e.NoteTypeEntity | None:
        # Match by slug OR key, within GLOBAL + this project's types.
        stmt = (
            select(m.NoteType)
            .where(
                or_(m.NoteType.slug == value, m.NoteType.key == value),
                or_(
                    m.NoteType.scope == ScopeKind.GLOBAL,
                    m.NoteType.project_id == project_id,
                ),
            )
            # Prefer a project-scoped match over a global one on a tie.
            .order_by(m.NoteType.project_id.isnot(None).desc())
        )
        orm = self.db.scalars(stmt).first()
        return mappers.note_type_to_domain(orm) if orm else None

    def list(self, *, scope: ScopeKind | None = None) -> list[e.NoteTypeEntity]:
        stmt = select(m.NoteType)
        if scope is not None:
            stmt = stmt.where(m.NoteType.scope == scope)
        stmt = stmt.order_by(m.NoteType.name)
        return [mappers.note_type_to_domain(o) for o in self.db.scalars(stmt).all()]

    def list_applicable(self, project_id: uuid.UUID) -> list[e.NoteTypeEntity]:
        stmt = (
            select(m.NoteType)
            .where(
                or_(
                    m.NoteType.scope == ScopeKind.GLOBAL,
                    m.NoteType.project_id == project_id,
                )
            )
            .order_by(m.NoteType.name)
        )
        return [mappers.note_type_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, note_type: e.NoteTypeEntity) -> e.NoteTypeEntity:
        orm = self.db.get(m.NoteType, note_type.id)
        if orm is None:
            raise NotFoundError("note type not found")
        orm.name = note_type.name
        orm.slug = note_type.slug
        orm.color = note_type.color
        orm.description = note_type.description
        self.db.flush()
        self.db.refresh(orm)
        return mappers.note_type_to_domain(orm)

    def delete(self, type_id: uuid.UUID) -> None:
        orm = self.db.get(m.NoteType, type_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, slug: str, project_id: uuid.UUID | None) -> bool:
        return self.get_by_slug(slug, project_id) is not None
```

   Confirm `or_` and `ScopeKind` are already imported in this file (they are — used by `SqlArtifactTypeRepository`).

- [ ] **Step 3: Verify import**

Run: `cd backend && python -c "from app.infrastructure import repositories, mappers"`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add backend/app/infrastructure/mappers.py backend/app/infrastructure/repositories.py
git commit -m "feat: note type SQL repository and note mapper"
```

---

## PHASE C — Backend application + schemas + API

### Task 5: DTO schemas

**Files:**
- Create: `backend/app/schemas/note_type.py`
- Modify: `backend/app/schemas/note.py`

- [ ] **Step 1: Create `note_type.py`**

```python
"""NoteType DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ScopeKind


class NoteTypeCreate(BaseModel):
    scope: ScopeKind
    name: str
    color: str
    description: str | None = None
    project_slug: str | None = None


class NoteTypeUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None


class NoteTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope: ScopeKind
    project_id: uuid.UUID | None
    key: str | None
    name: str
    slug: str
    color: str
    description: str | None
    is_default: bool
    created_at: datetime | None
    updated_at: datetime | None
```

- [ ] **Step 2: Update `note.py`**

```python
"""Note DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NoteTypeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str | None
    slug: str
    name: str
    color: str


class NoteCreate(BaseModel):
    type: str  # note-type slug or key (e.g. "requirement" / "REQUIREMENT")
    content: str
    title: str | None = None
    tags: list[str] = []
    domain_id: uuid.UUID | None = None


class NoteUpdate(BaseModel):
    type: str | None = None
    content: str | None = None
    title: str | None = None
    tags: list[str] | None = None
    domain_id: uuid.UUID | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    note_type_id: uuid.UUID
    type: NoteTypeSummary
    title: str | None
    content: str
    tags: list[str]
    created_at: datetime | None
    updated_at: datetime | None
```

- [ ] **Step 3: Verify import**

Run: `cd backend && python -c "from app.schemas import note, note_type"`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/note_type.py backend/app/schemas/note.py
git commit -m "feat: note type DTOs and string-typed note schema"
```

---

### Task 6: NoteType application service

**Files:**
- Create: `backend/app/application/note_type_service.py`
- Test: `backend/tests/test_note_types_api.py`

- [ ] **Step 1: Write the failing API test**

Create `backend/tests/test_note_types_api.py`:

```python
"""Configurable note types: CRUD, color validation, delete-in-use guard."""

from fastapi.testclient import TestClient


def test_builtin_types_seeded_global(client: TestClient) -> None:
    resp = client.get("/note-types", params={"scope": "GLOBAL"})
    assert resp.status_code == 200, resp.text
    keys = {t["key"] for t in resp.json()}
    assert {"REQUIREMENT", "CONSTRAINT", "DECISION", "QUESTION", "SNIPPET", "REFERENCE"} <= keys


def test_create_project_type_and_list_applicable(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    resp = client.post(
        "/note-types",
        json={"scope": "PROJECT", "name": "Risk", "color": "amber", "project_slug": slug},
    )
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["slug"] == "risk"
    assert created["color"] == "amber"

    applicable = client.get(f"/projects/{slug}/note-types").json()
    names = {t["name"] for t in applicable}
    assert "Risk" in names and "Requirement" in names  # project + global


def test_create_rejects_bad_color(client: TestClient) -> None:
    resp = client.post("/note-types", json={"scope": "GLOBAL", "name": "Weird", "color": "hotpink"})
    assert resp.status_code == 422, resp.text


def test_update_label_and_color(client: TestClient) -> None:
    created = client.post(
        "/note-types", json={"scope": "GLOBAL", "name": "Spike", "color": "blue"}
    ).json()
    resp = client.patch(f"/note-types/{created['id']}", json={"name": "Spike!", "color": "green"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Spike!" and resp.json()["color"] == "green"


def test_delete_unused_type(client: TestClient) -> None:
    created = client.post(
        "/note-types", json={"scope": "GLOBAL", "name": "Temp", "color": "slate"}
    ).json()
    assert client.delete(f"/note-types/{created['id']}").status_code == 204


def test_delete_in_use_type_blocked(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    nt = client.post(
        "/note-types",
        json={"scope": "PROJECT", "name": "InUse", "color": "red", "project_slug": slug},
    ).json()
    note = client.post(f"/projects/{slug}/notes", json={"type": "in-use", "content": "x"})
    assert note.status_code == 201, note.text
    resp = client.delete(f"/note-types/{nt['id']}")
    assert resp.status_code == 409, resp.text
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd backend && pytest tests/test_note_types_api.py -x -q`
Expected: FAIL (404s — `/note-types` route does not exist yet).

- [ ] **Step 3: Write the service**

Create `backend/app/application/note_type_service.py`:

```python
"""NoteType service: scope<->project invariant + color validation."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import NoteTypeEntity
from app.domain.enums import NOTE_TYPE_COLORS, ScopeKind
from app.domain.errors import NotFoundError, ValidationError
from app.domain.repositories import NoteTypeRepository, ProjectRepository

_UPDATABLE = {"name", "color", "description"}


class NoteTypeService:
    def __init__(self, repo: NoteTypeRepository, project_repo: ProjectRepository) -> None:
        self.repo = repo
        self.project_repo = project_repo

    def _resolve_project_id(self, project_slug: str | None) -> uuid.UUID | None:
        if project_slug is None:
            return None
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

    @staticmethod
    def _validate_color(color: str) -> None:
        if color not in NOTE_TYPE_COLORS:
            raise ValidationError(
                f"color must be one of {sorted(NOTE_TYPE_COLORS)}"
            )

    def create(
        self,
        *,
        scope: ScopeKind,
        name: str,
        color: str,
        description: str | None = None,
        project_slug: str | None = None,
    ) -> NoteTypeEntity:
        if scope == ScopeKind.GLOBAL and project_slug is not None:
            raise ValidationError("a GLOBAL note type must not target a project")
        if scope == ScopeKind.PROJECT and project_slug is None:
            raise ValidationError("a PROJECT note type requires a project")
        self._validate_color(color)
        project_id = self._resolve_project_id(project_slug)
        slug = make_unique_slug(name, lambda s: self.repo.slug_exists(s, project_id))
        return self.repo.add(
            NoteTypeEntity(
                id=uuid.uuid4(),
                scope=scope,
                project_id=project_id,
                key=None,
                name=name,
                slug=slug,
                color=color,
                description=description,
                is_default=False,
            )
        )

    def get(self, type_id: uuid.UUID) -> NoteTypeEntity:
        note_type = self.repo.get_by_id(type_id)
        if note_type is None:
            raise NotFoundError("note type not found")
        return note_type

    def list(self, *, scope: ScopeKind | None = None) -> list[NoteTypeEntity]:
        return self.repo.list(scope=scope)

    def list_applicable(self, project_slug: str) -> list[NoteTypeEntity]:
        project_id = self._resolve_project_id(project_slug)
        assert project_id is not None
        return self.repo.list_applicable(project_id)

    def update(self, type_id: uuid.UUID, changes: dict) -> NoteTypeEntity:
        note_type = self.get(type_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        if "color" in applied and applied["color"] is not None:
            self._validate_color(applied["color"])
        return self.repo.update(replace(note_type, **applied))

    def delete(self, type_id: uuid.UUID) -> None:
        self.get(type_id)  # 404 if missing
        # FK ondelete RESTRICT raises IntegrityError when notes still reference it,
        # mapped to HTTP 409 by the global handler.
        self.repo.delete(type_id)
```

(The router in Task 8 makes the test pass; service alone is not enough. Run the full check at the end of Task 8.)

- [ ] **Step 4: Commit**

```bash
git add backend/app/application/note_type_service.py backend/tests/test_note_types_api.py
git commit -m "feat: note type service with color validation"
```

---

### Task 7: Resolve type string in NoteService

**Files:**
- Modify: `backend/app/application/note_service.py`

- [ ] **Step 1: Add the note-type repo + resolution**

Rewrite `backend/app/application/note_service.py`:

```python
"""Note service: enforces the note/domain-belongs-to-project invariant."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.domain.entities import Note
from app.domain.errors import NotFoundError, ValidationError
from app.domain.repositories import (
    DomainRepository,
    NoteRepository,
    NoteTypeRepository,
    ProjectRepository,
)
from app.domain.vector import KIND_NOTE

_UPDATABLE = {"domain_id", "title", "content", "tags"}


class NoteService:
    def __init__(
        self,
        repo: NoteRepository,
        project_repo: ProjectRepository,
        domain_repo: DomainRepository,
        note_type_repo: NoteTypeRepository,
        indexer=None,
    ) -> None:
        self.repo = repo
        self.project_repo = project_repo
        self.domain_repo = domain_repo
        self.note_type_repo = note_type_repo
        self.indexer = indexer

    def _require_project_id(self, project_slug: str) -> uuid.UUID:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

    def _validate_domain(self, project_id: uuid.UUID, domain_id: uuid.UUID | None) -> None:
        if domain_id is None:
            return
        domain = self.domain_repo.get_by_id(domain_id)
        if domain is None or domain.project_id != project_id:
            raise ValidationError("domain does not belong to this project")

    def _resolve_type_id(self, project_id: uuid.UUID, value: str) -> uuid.UUID:
        note_type = self.note_type_repo.resolve(value, project_id)
        if note_type is None:
            raise ValidationError(f"unknown note type '{value}'")
        return note_type.id

    def create(
        self,
        project_slug: str,
        *,
        type: str,
        content: str,
        title: str | None = None,
        tags: list[str] | None = None,
        domain_id: uuid.UUID | None = None,
    ) -> Note:
        project_id = self._require_project_id(project_slug)
        self._validate_domain(project_id, domain_id)
        note_type_id = self._resolve_type_id(project_id, type)
        note = self.repo.add(
            Note(
                id=uuid.uuid4(),
                project_id=project_id,
                note_type_id=note_type_id,
                domain_id=domain_id,
                title=title,
                content=content,
                tags=tags or [],
            )
        )
        if self.indexer is not None:
            self.indexer.index_note(note)
        return note

    def get(self, note_id: uuid.UUID) -> Note:
        note = self.repo.get_by_id(note_id)
        if note is None:
            raise NotFoundError("note not found")
        return note

    def list(
        self,
        project_slug: str,
        *,
        domain_id: uuid.UUID | None = None,
        type: str | None = None,
        tag: str | None = None,
    ) -> list[Note]:
        project_id = self._require_project_id(project_slug)
        note_type_id = self._resolve_type_id(project_id, type) if type else None
        return self.repo.list(
            project_id, domain_id=domain_id, note_type_id=note_type_id, tag=tag
        )

    def update(self, note_id: uuid.UUID, changes: dict) -> Note:
        note = self.get(note_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        if "domain_id" in applied:
            self._validate_domain(note.project_id, applied["domain_id"])
        if changes.get("type"):
            applied["note_type_id"] = self._resolve_type_id(note.project_id, changes["type"])
        updated = self.repo.update(replace(note, **applied))
        if self.indexer is not None:
            self.indexer.index_note(updated)
        return updated

    def delete(self, note_id: uuid.UUID) -> None:
        note = self.get(note_id)
        self.repo.delete(note.id)
        if self.indexer is not None:
            self.indexer.remove(KIND_NOTE, note.id)
```

Note: `replace(note, **applied)` works because `Note.type` (the ref) stays as-is on update; the repo only reads `note.note_type_id`.

- [ ] **Step 2: Verify import**

Run: `cd backend && python -c "from app.application import note_service"`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add backend/app/application/note_service.py
git commit -m "feat: resolve note type by slug or key in NoteService"
```

---

### Task 8: Routers + deps + app wiring

**Files:**
- Create: `backend/app/api/routers/note_types.py`
- Modify: `backend/app/api/routers/notes.py`
- Modify: `backend/app/api/deps.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the note-types router**

```python
"""NoteType endpoints (mirror artifact_types; delete-in-use -> 409 via FK)."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_note_type_service
from app.application.note_type_service import NoteTypeService
from app.domain.enums import ScopeKind
from app.schemas.note_type import NoteTypeCreate, NoteTypeRead, NoteTypeUpdate

router = APIRouter(tags=["note-types"])


@router.get("/note-types", response_model=list[NoteTypeRead])
def list_note_types(
    scope: ScopeKind | None = None,
    service: NoteTypeService = Depends(get_note_type_service),
) -> list[NoteTypeRead]:
    return [NoteTypeRead.model_validate(t) for t in service.list(scope=scope)]


@router.post("/note-types", response_model=NoteTypeRead, status_code=201)
def create_note_type(
    payload: NoteTypeCreate,
    service: NoteTypeService = Depends(get_note_type_service),
) -> NoteTypeRead:
    note_type = service.create(
        scope=payload.scope,
        name=payload.name,
        color=payload.color,
        description=payload.description,
        project_slug=payload.project_slug,
    )
    return NoteTypeRead.model_validate(note_type)


@router.get("/note-types/{type_id}", response_model=NoteTypeRead)
def get_note_type(
    type_id: uuid.UUID, service: NoteTypeService = Depends(get_note_type_service)
) -> NoteTypeRead:
    return NoteTypeRead.model_validate(service.get(type_id))


@router.patch("/note-types/{type_id}", response_model=NoteTypeRead)
def update_note_type(
    type_id: uuid.UUID,
    payload: NoteTypeUpdate,
    service: NoteTypeService = Depends(get_note_type_service),
) -> NoteTypeRead:
    changes = payload.model_dump(exclude_unset=True)
    return NoteTypeRead.model_validate(service.update(type_id, changes))


@router.delete("/note-types/{type_id}", status_code=204)
def delete_note_type(
    type_id: uuid.UUID, service: NoteTypeService = Depends(get_note_type_service)
) -> None:
    service.delete(type_id)


@router.get("/projects/{slug}/note-types", response_model=list[NoteTypeRead])
def list_applicable_note_types(
    slug: str, service: NoteTypeService = Depends(get_note_type_service)
) -> list[NoteTypeRead]:
    return [NoteTypeRead.model_validate(t) for t in service.list_applicable(slug)]
```

- [ ] **Step 2: Update the notes router type filter**

In `backend/app/api/routers/notes.py`:
- Remove `from app.domain.enums import NoteType`.
- Change the `list_notes` query param `type: NoteType | None = None` to `type: str | None = None`.
(The `create_note` call already passes `payload.type`, now a `str` — no change needed.)

- [ ] **Step 3: Wire deps**

In `backend/app/api/deps.py`:
- Import: `from app.application.note_type_service import NoteTypeService` and add `SqlNoteTypeRepository` to the repositories import block.
- Update `get_note_service` to pass the note-type repo:

```python
def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(
        SqlNoteRepository(db),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
        SqlNoteTypeRepository(db),
        indexer=get_indexer(),
    )
```

- Add the service factory:

```python
def get_note_type_service(db: Session = Depends(get_db)) -> NoteTypeService:
    return NoteTypeService(SqlNoteTypeRepository(db), SqlProjectRepository(db))
```

- In `get_template_service` (around line 122) there is a second `NoteService(...)` construction. Add `SqlNoteTypeRepository(db)` as its 4th positional argument too (same order as above), so templates that seed notes keep working.

- [ ] **Step 4: Register the router**

In `backend/app/main.py`:
- Add `note_types` to the `from app.api.routers import (...)` block.
- Add `note_types,` to the `for module in (...)` registration tuple (e.g. right after `notes,`).

- [ ] **Step 5: Run the note-types test + the notes suite — expect pass**

Run:
```bash
cd backend && pytest tests/test_note_types_api.py tests/test_notes_tasks_api.py -q
```
Expected: all PASS. (If `test_notes_tasks_api.py` asserts on the old `type` enum response shape, update those assertions to read `note["type"]["key"]` / `note["type"]["slug"]`.)

- [ ] **Step 6: Run the full backend suite**

Run: `cd backend && pytest -q`
Expected: all PASS. Fix any test reading `note["type"]` as a string — it is now an object `{id,key,slug,name,color}`.

- [ ] **Step 7: Commit**

```bash
git add backend/app/api/ backend/app/main.py
git commit -m "feat: note-types API endpoints and wiring"
```

---

### Task 9: Add a note-type filtering test (regression)

**Files:**
- Modify: `backend/tests/test_notes_tasks_api.py`

- [ ] **Step 1: Add a test that filtering by slug still works**

Append to `backend/tests/test_notes_tasks_api.py`:

```python
def test_note_filtering_by_type_slug(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    client.post(f"/projects/{slug}/notes", json={"type": "requirement", "content": "r"})
    client.post(f"/projects/{slug}/notes", json={"type": "decision", "content": "d"})

    resp = client.get(f"/projects/{slug}/notes", params={"type": "decision"})
    assert resp.status_code == 200, resp.text
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["type"]["slug"] == "decision"


def test_create_note_with_uppercase_key_backcompat(client: TestClient, make_project) -> None:
    # MCP / legacy clients send the uppercase enum value; resolution must accept it.
    slug = make_project()["slug"]
    resp = client.post(f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "x"})
    assert resp.status_code == 201, resp.text
    assert resp.json()["type"]["key"] == "REQUIREMENT"
```

- [ ] **Step 2: Run**

Run: `cd backend && pytest tests/test_notes_tasks_api.py -q`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_notes_tasks_api.py
git commit -m "test: note filtering by slug and uppercase-key back-compat"
```

---

## PHASE D — Frontend types + API client

### Task 10: Types + API methods

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update `types.ts`**

1. Add the color palette + interfaces (place near the existing `NoteType` section):

```typescript
export const NOTE_TYPE_COLORS = [
  "violet",
  "blue",
  "green",
  "amber",
  "red",
  "slate",
  "neutral",
] as const;
export type NoteTypeColor = (typeof NOTE_TYPE_COLORS)[number];

/** Compact note-type summary embedded in a note. */
export interface NoteTypeRef {
  id: string;
  key: string | null;
  slug: string;
  name: string;
  color: NoteTypeColor;
}

export interface NoteTypeRead {
  id: string;
  scope: ScopeKind;
  project_id: string | null;
  key: string | null;
  name: string;
  slug: string;
  color: NoteTypeColor;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteTypeCreate {
  scope: ScopeKind;
  name: string;
  color: NoteTypeColor;
  description?: string | null;
  project_slug?: string | null;
}

export interface NoteTypeUpdate {
  name?: string | null;
  color?: NoteTypeColor | null;
  description?: string | null;
}
```

2. Change `NoteRead.type` from `NoteType` to the ref, and add `note_type_id`:

```typescript
export interface NoteRead {
  id: string;
  project_id: string;
  domain_id: string | null;
  note_type_id: string;
  type: NoteTypeRef;
  title: string | null;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
```

3. Change `NoteCreate.type` and `NoteUpdate.type` to `string` (slug/key):

```typescript
export interface NoteCreate {
  type: string;
  content: string;
  title?: string | null;
  tags?: string[];
  domain_id?: string | null;
}

export interface NoteUpdate {
  type?: string | null;
  content?: string | null;
  title?: string | null;
  tags?: string[] | null;
  domain_id?: string | null;
}
```

4. Keep the existing `NoteType` string-union + `NOTE_TYPES` const for now (used by the badge i18n keys); they are removed where no longer referenced in later tasks.

- [ ] **Step 2: Add API methods in `api.ts`**

1. Add to the type imports: `NoteTypeCreate, NoteTypeRead, NoteTypeUpdate`.
2. Add to the `api` object (after the artifact-type methods):

```typescript
  // note types
  listNoteTypes: (scope?: "GLOBAL" | "PROJECT") =>
    apiFetch<NoteTypeRead[]>("/note-types", { query: scope ? { scope } : undefined }),
  listProjectNoteTypes: (slug: string) =>
    apiFetch<NoteTypeRead[]>(`/projects/${slug}/note-types`),
  createNoteType: (body: NoteTypeCreate) =>
    apiFetch<NoteTypeRead>("/note-types", { method: "POST", body }),
  updateNoteType: (typeId: string, body: NoteTypeUpdate) =>
    apiFetch<NoteTypeRead>(`/note-types/${typeId}`, { method: "PATCH", body }),
  deleteNoteType: (typeId: string) =>
    apiFetch<void>(`/note-types/${typeId}`, { method: "DELETE" }),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts
git commit -m "feat: note type types and api client methods"
```

---

## PHASE E — Frontend rendering of dynamic types

### Task 11: Badge accepts a type ref

**Files:**
- Modify: `frontend/src/components/status-badge.tsx`

- [ ] **Step 1: Make `NoteTypeBadge` take a type ref**

In `status-badge.tsx`:
1. Import `NoteTypeRef` (and `NoteTypeColor`) from `@/lib/types`; remove the `NoteType` import if now unused.
2. Delete the static `NOTE_TYPE_TONE` record.
3. Replace the `NoteTypeBadge` component:

```typescript
export const NoteTypeBadge = ({ type }: { type: NoteTypeRef }) => {
  const t = useT();
  const label = type.key
    ? t(`enums.noteType.${type.key}`, { defaultValue: type.name })
    : type.name;
  return <Pill tone={type.color as Tone}>{label}</Pill>;
};
```

   Note: `type.color` is one of the 7 tone names, so it maps directly to `Tone`. Confirm the project's `useT()` supports a `defaultValue` option; if not, use `type.key && hasKey ? ... : type.name` via a guard — simplest portable form:

```typescript
  const translated = type.key ? t(`enums.noteType.${type.key}`) : null;
  const label = translated && !translated.startsWith("enums.") ? translated : type.name;
```

   Use whichever matches the existing `useT` contract (check `src/i18n/locale-context.tsx` for the missing-key behavior and pick the matching variant).

- [ ] **Step 2: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: errors only in the not-yet-updated call sites (note-card, notes-tab, filter-bar, composer) — those are fixed in Tasks 12–13. The badge file itself must be error-free.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/status-badge.tsx
git commit -m "feat: note type badge renders stored color and label"
```

---

### Task 12: Note-type picker + form fields + composer/edit

**Files:**
- Create: `frontend/src/components/notes/note-type-picker.tsx`
- Modify: `frontend/src/components/notes/note-form-fields.tsx`
- Modify: `frontend/src/components/notes/quick-note-composer.tsx`
- Modify: `frontend/src/components/notes/note-edit-dialog.tsx`

- [ ] **Step 1: Create the picker (SWR over applicable types)**

`frontend/src/components/notes/note-type-picker.tsx`:

```typescript
"use client";

import useSWR from "swr";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteTypeBadge } from "@/components/status-badge";
import type { NoteTypeRead } from "@/lib/types";

interface NoteTypePickerProps {
  projectSlug: string;
  /** Selected type slug. */
  value: string;
  onChange: (slug: string) => void;
  id?: string;
}

/** SWR-backed picker over the note types available to a project (global + project). */
export function NoteTypePicker({ projectSlug, value, onChange, id }: NoteTypePickerProps) {
  const { data, isLoading } = useSWR<NoteTypeRead[]>(
    `/projects/${projectSlug}/note-types`,
  );

  if (isLoading) return <Skeleton className="h-9 w-full" />;

  const types = data ?? [];

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {types.map((type) => (
          <SelectItem key={type.id} value={type.slug}>
            <span className="flex items-center gap-2">
              <NoteTypeBadge
                type={{
                  id: type.id,
                  key: type.key,
                  slug: type.slug,
                  name: type.name,
                  color: type.color,
                }}
              />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Update `note-form-fields.tsx`**

1. The form value type changes: `NoteFormValues.type` becomes `string` (slug). Update `EMPTY_NOTE_FORM.type` from `"REQUIREMENT"` to `""` (empty = "pick the project default"; the composer sets a real default once types load — Step 3).
2. Replace the hardcoded type `<Select>` block (the one mapping `NOTE_TYPES`) with the picker. The component now needs `projectSlug`:
   - Add `projectSlug: string` to `NoteFormFieldsProps`.
   - Render:

```tsx
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-type`} className="text-xs text-muted-foreground">
            {t("notes.fields.typeLabel")}
          </Label>
          <NoteTypePicker
            id={`${idPrefix}-type`}
            projectSlug={projectSlug}
            value={values.type}
            onChange={(type) => onChange({ type })}
          />
        </div>
```

3. Remove the now-unused imports (`Select*` for the type field if not used elsewhere in the file, `NOTE_TYPES`, `NoteTypeBadge`, `NoteType`). Keep `Select*` if still used by the domain picker (it is — leave them).
4. Update `noteTypeLabel(type: NoteType)` helper: it is used by the composer toast. Change it to accept a plain label string the caller already has, OR keep it as `noteTypeLabel(type: string)` returning `titleCase(type)`. Simplest: change signature to `(type: string)` and keep `titleCase`.
5. Change `NoteFormValues.type` type annotation to `string`.

- [ ] **Step 3: Update `quick-note-composer.tsx`**

1. Pass `projectSlug` to `<NoteFormFields … projectSlug={projectSlug} />`.
2. Default the type once applicable types load, so the picker isn't empty. Add an SWR read of the applicable types and seed `values.type` if empty:

```tsx
  const { data: noteTypes } = useSWR<NoteTypeRead[]>(
    `/projects/${projectSlug}/note-types`,
  );

  useEffect(() => {
    if (!values.type && noteTypes && noteTypes.length > 0) {
      // Default to the "requirement" built-in if present, else the first type.
      const fallback =
        noteTypes.find((t) => t.key === "REQUIREMENT") ?? noteTypes[0];
      setValues((prev) => ({ ...prev, type: fallback.slug }));
    }
  }, [noteTypes, values.type]);
```

3. The `makeOptimisticNote` builder sets `type: values.type` on the optimistic `NoteRead`. Since `NoteRead.type` is now a `NoteTypeRef`, build the ref from the loaded list:

```tsx
  function makeOptimisticNote(/* …existing args… */, noteType: NoteTypeRead): NoteRead {
    // …unchanged fields…
    return {
      // …
      note_type_id: noteType.id,
      type: {
        id: noteType.id,
        key: noteType.key,
        slug: noteType.slug,
        name: noteType.name,
        color: noteType.color,
      },
      // …
    };
  }
```

   In `submit`, look up the chosen type before building the optimistic note:

```tsx
    const chosen = (noteTypes ?? []).find((t) => t.slug === values.type);
    if (!chosen) return; // types not loaded yet
    const optimistic = makeOptimisticNote(values, projectSlug, fixedDomainId, tags, chosen);
```

4. The success toast currently calls `noteTypeLabel(values.type)`. Replace with `chosen.name`.
5. After submit, the reset keeps `type: prev.type` (the slug) — fine, leave it.
6. Add the `NoteTypeRead` import.

- [ ] **Step 4: Update `note-edit-dialog.tsx`**

Open the file; it builds a `NoteFormValues` from a `NoteRead` and submits an update. Changes:
1. Pass `projectSlug` to `<NoteFormFields>` (derive from the note — the dialog already receives the note; use `note.project_id`? No — slug is needed. The dialog is rendered from `notes-tab` which has `project.slug`; thread a `projectSlug` prop into `NoteEditDialog` and pass it down). Add `projectSlug: string` to its props and pass `project.slug` from `notes-tab`.
2. Initialise the form `type` from `note.type.slug` (was `note.type`).
3. On submit, send `type: values.type` (slug string) in the `NoteUpdate` body — already a string, no change beyond the source value.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/notes/note-type-picker.tsx \
        frontend/src/components/notes/note-form-fields.tsx \
        frontend/src/components/notes/quick-note-composer.tsx \
        frontend/src/components/notes/note-edit-dialog.tsx
git commit -m "feat: dynamic note-type picker in composer and edit dialog"
```

---

### Task 13: Notes tab + filter bar + card (dynamic grouping)

**Files:**
- Modify: `frontend/src/components/project/tabs/notes-tab.tsx`
- Modify: `frontend/src/components/notes/notes-filter-bar.tsx`
- Modify: `frontend/src/components/notes/note-card.tsx`

- [ ] **Step 1: `note-card.tsx`**

Change the badge usage from `<NoteTypeBadge type={note.type} />` — `note.type` is now the ref, which the updated badge accepts directly. No other change. Confirm the `NoteRead` import still type-checks.

- [ ] **Step 2: `notes-filter-bar.tsx` — dynamic chips**

Rewrite the props + chip list to be keyed by slug and driven by the applicable types:

```typescript
import type { NoteTypeRead } from "@/lib/types";

interface NotesFilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  activeType: string | "ALL"; // slug or ALL
  onTypeChange: (value: string | "ALL") => void;
  types: NoteTypeRead[];          // applicable types, ordered
  counts: Record<string, number>; // keyed by slug
  total: number;
}
```

In the chip list, replace the `NOTE_TYPES.filter(...)` map with:

```tsx
        {types
          .filter((type) => (counts[type.slug] ?? 0) > 0)
          .map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() =>
                onTypeChange(activeType === type.slug ? "ALL" : type.slug)
              }
              className={cn(
                "rounded-full outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring",
                activeType === type.slug
                  ? "ring-2 ring-primary/40"
                  : "opacity-70 hover:opacity-100",
              )}
              aria-pressed={activeType === type.slug}
            >
              <NoteTypeBadge
                type={{
                  id: type.id,
                  key: type.key,
                  slug: type.slug,
                  name: type.name,
                  color: type.color,
                }}
              />
            </button>
          ))}
```

Remove the `NOTE_TYPES`/`NoteType` imports.

- [ ] **Step 3: `notes-tab.tsx` — dynamic grouping/counts**

1. Fetch the applicable types:

```tsx
  const { data: noteTypes } = useSWR<NoteTypeRead[]>(
    `/projects/${project.slug}/note-types`,
  );
  const types = useMemo(() => {
    const list = noteTypes ?? [];
    return [...list].sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [noteTypes]);
```

2. `activeType` state type: `string | "ALL"` (was `NoteType | "ALL"`).
3. Replace `emptyCounts()` + `counts` with a slug-keyed reducer:

```tsx
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const note of scoped) {
      next[note.type.slug] = (next[note.type.slug] ?? 0) + 1;
    }
    return next;
  }, [scoped]);
```

4. `filtered` predicate: `(activeType === "ALL" || note.type.slug === activeType)`.
5. `grouped`: iterate `types` and bucket by slug:

```tsx
  const grouped = useMemo(
    () =>
      types
        .map((type) => ({
          type,
          notes: filtered.filter((note) => note.type.slug === type.slug),
        }))
        .filter((group) => group.notes.length > 0),
    [types, filtered],
  );
```

6. In the group header, render the badge from the type ref:

```tsx
                  <NoteTypeBadge
                    type={{
                      id: group.type.id,
                      key: group.type.key,
                      slug: group.type.slug,
                      name: group.type.name,
                      color: group.type.color,
                    }}
                  />
```

   and `key={group.type.id}` on the `<section>`.
7. Pass the new props to `<NotesFilterBar … types={types} counts={counts} />`.
8. Pass `projectSlug={project.slug}` to `<NoteEditDialog>`.
9. Update imports: remove `NOTE_TYPES`; import `NoteTypeRead` and keep `NoteRead`; drop the now-unused `NoteType` import and the `emptyCounts` function.

- [ ] **Step 4: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors across notes components. Fix any stragglers.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/project/tabs/notes-tab.tsx \
        frontend/src/components/notes/notes-filter-bar.tsx \
        frontend/src/components/notes/note-card.tsx
git commit -m "feat: dynamic note-type grouping and filtering in notes tab"
```

---

## PHASE F — Frontend settings surface

### Task 14: Note-type manager dialogs

**Files:**
- Create: `frontend/src/components/note-types/note-type-dialog.tsx`
- Create: `frontend/src/components/note-types/delete-note-type-dialog.tsx`

- [ ] **Step 1: Create the create/edit dialog**

`frontend/src/components/note-types/note-type-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import {
  NOTE_TYPE_COLORS,
  type NoteTypeColor,
  type NoteTypeCreate,
  type NoteTypeRead,
  type NoteTypeUpdate,
  type ScopeKind,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NoteTypeBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface NoteTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: NoteTypeRead | null;
  /** Scope for newly-created types. */
  scope: ScopeKind;
  /** Required when scope === "PROJECT". */
  projectSlug?: string;
  onSaved: () => void;
}

interface FormState {
  name: string;
  description: string;
  color: NoteTypeColor;
}

const EMPTY_FORM: FormState = { name: "", description: "", color: "violet" };

function toForm(type: NoteTypeRead | null | undefined): FormState {
  if (!type) return EMPTY_FORM;
  return { name: type.name, description: type.description ?? "", color: type.color };
}

export function NoteTypeDialog({
  open,
  onOpenChange,
  type,
  scope,
  projectSlug,
  onSaved,
}: NoteTypeDialogProps) {
  const t = useT();
  const [form, setForm] = useState<FormState>(() => toForm(type));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(type);

  useEffect(() => {
    if (open) setForm(toForm(type));
  }, [open, type]);

  const canSave = form.name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      if (isEdit && type) {
        const body: NoteTypeUpdate = {
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
        };
        await api.updateNoteType(type.id, body);
        toast.success(t("noteTypes.toasts.updated"));
      } else {
        const body: NoteTypeCreate = {
          scope,
          name: form.name.trim(),
          color: form.color,
          description: form.description.trim() || null,
          project_slug: scope === "PROJECT" ? (projectSlug ?? null) : null,
        };
        await api.createNoteType(body);
        toast.success(t("noteTypes.toasts.created"));
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("noteTypes.toasts.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("noteTypes.dialog.editTitle") : t("noteTypes.dialog.newTitle")}
          </DialogTitle>
          <DialogDescription>{t("noteTypes.dialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nt-name">{t("noteTypes.dialog.nameLabel")}</Label>
            <Input
              id="nt-name"
              value={form.name}
              placeholder={t("noteTypes.dialog.namePlaceholder")}
              autoFocus
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nt-description">{t("noteTypes.dialog.descriptionLabel")}</Label>
            <Input
              id="nt-description"
              value={form.description}
              placeholder={t("noteTypes.dialog.descriptionPlaceholder")}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("noteTypes.dialog.colorLabel")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {NOTE_TYPE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={form.color === color}
                  aria-label={color}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className={cn(
                    "rounded-full outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
                    form.color === color ? "ring-2 ring-primary/50" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <NoteTypeBadge
                    type={{
                      id: color,
                      key: null,
                      slug: color,
                      name: form.name.trim() || t("noteTypes.dialog.preview"),
                      color,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving
                ? t("common.saving")
                : isEdit
                  ? t("common.saveChanges")
                  : t("noteTypes.dialog.createType")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the delete dialog**

`frontend/src/components/note-types/delete-note-type-dialog.tsx` — mirror of `artifact-types/delete-type-dialog.tsx`, calling `api.deleteNoteType`. The 409 (in-use) surfaces via `ApiError.message`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useT } from "@/i18n/locale-context";
import type { NoteTypeRead } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteNoteTypeDialogProps {
  type: NoteTypeRead | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteNoteTypeDialog({ type, onOpenChange, onDeleted }: DeleteNoteTypeDialogProps) {
  const t = useT();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(): Promise<void> {
    if (!type || deleting) return;
    setDeleting(true);
    try {
      await api.deleteNoteType(type.id);
      toast.success(t("noteTypes.toasts.deleted"));
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      // 409 when notes still use this type — show the server message.
      toast.error(e instanceof ApiError ? e.message : t("noteTypes.toasts.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={Boolean(type)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("noteTypes.deleteDialog.title", { name: type?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("noteTypes.deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {deleting ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/note-types/
git commit -m "feat: note-type create/edit and delete dialogs"
```

---

### Task 15: Manager + settings page + entry point

**Files:**
- Create: `frontend/src/components/note-types/note-types-manager.tsx`
- Create: `frontend/src/app/projects/[slug]/settings/page.tsx`
- Modify: project page header (entry point) — see Step 3

- [ ] **Step 1: Manager component (expandable rows; GLOBAL + PROJECT sections)**

`frontend/src/components/note-types/note-types-manager.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";

import type { NoteTypeRead, ScopeKind } from "@/lib/types";
import { useT } from "@/i18n/locale-context";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteTypeBadge } from "@/components/status-badge";
import { NoteTypeDialog } from "@/components/note-types/note-type-dialog";
import { DeleteNoteTypeDialog } from "@/components/note-types/delete-note-type-dialog";

interface NoteTypesManagerProps {
  projectSlug: string;
}

function sortTypes(list: NoteTypeRead[]): NoteTypeRead[] {
  return [...list].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function NoteTypesManager({ projectSlug }: NoteTypesManagerProps) {
  const t = useT();
  const key = `/projects/${projectSlug}/note-types`;
  const { data, isLoading, mutate } = useSWR<NoteTypeRead[]>(key);

  const [dialogScope, setDialogScope] = useState<ScopeKind>("PROJECT");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NoteTypeRead | null>(null);
  const [deleting, setDeleting] = useState<NoteTypeRead | null>(null);

  const { globalTypes, projectTypes } = useMemo(() => {
    const all = data ?? [];
    return {
      globalTypes: sortTypes(all.filter((tpe) => tpe.scope === "GLOBAL")),
      projectTypes: sortTypes(all.filter((tpe) => tpe.scope === "PROJECT")),
    };
  }, [data]);

  function openCreate(scope: ScopeKind): void {
    setEditing(null);
    setDialogScope(scope);
    setDialogOpen(true);
  }

  function openEdit(type: NoteTypeRead): void {
    setEditing(type);
    setDialogScope(type.scope);
    setDialogOpen(true);
  }

  function Row({ type }: { type: NoteTypeRead }) {
    return (
      <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <NoteTypeBadge
            type={{ id: type.id, key: type.key, slug: type.slug, name: type.name, color: type.color }}
          />
          {type.description ? (
            <span className="truncate text-sm text-muted-foreground">{type.description}</span>
          ) : null}
          {type.is_default ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
              {t("noteTypes.builtin")}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t("common.edit")} onClick={() => openEdit(type)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common.delete")}
            onClick={() => setDeleting(type)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("noteTypes.project.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("noteTypes.project.description")}</p>
          </div>
          <Button size="sm" onClick={() => openCreate("PROJECT")}>
            <Plus className="size-4" />
            {t("noteTypes.addType")}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : projectTypes.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t("noteTypes.project.emptyTitle")}
            description={t("noteTypes.project.emptyDescription")}
          />
        ) : (
          <div className="space-y-2">
            {projectTypes.map((type) => (
              <Row key={type.id} type={type} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("noteTypes.global.title")}</h3>
            <p className="text-xs text-muted-foreground">{t("noteTypes.global.description")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openCreate("GLOBAL")}>
            <Plus className="size-4" />
            {t("noteTypes.addGlobalType")}
          </Button>
        </div>
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : (
          <div className="space-y-2">
            {globalTypes.map((type) => (
              <Row key={type.id} type={type} />
            ))}
          </div>
        )}
      </section>

      <NoteTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={editing}
        scope={dialogScope}
        projectSlug={projectSlug}
        onSaved={() => void mutate()}
      />
      <DeleteNoteTypeDialog
        type={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onDeleted={() => void mutate()}
      />
    </div>
  );
}
```

- [ ] **Step 2: Settings page**

Inspect an existing project subroute page for the shell pattern: `src/app/projects/[slug]/skills/page.tsx` (params handling, how it loads the project, header/back-link). Create `src/app/projects/[slug]/settings/page.tsx` mirroring that shell, rendering a `PageHeader` (title `t("settings.noteTypes.title")`, description) and `<NoteTypesManager projectSlug={slug} />`. Match how `skills/page.tsx` resolves the `slug` param (await `params` if it is a promise in this Next version — follow the existing file exactly).

```tsx
// Shape (adapt the param + project-loading boilerplate to match skills/page.tsx):
import { NoteTypesManager } from "@/components/note-types/note-types-manager";
// …same imports/shell as skills/page.tsx…

export default async function ProjectSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="space-y-8">
      {/* reuse the same header/back-link wrapper skills/page.tsx uses */}
      <NoteTypesManager projectSlug={slug} />
    </div>
  );
}
```

- [ ] **Step 3: Entry point on the project page**

Open `src/app/projects/[slug]/page.tsx` and find the project header actions area (where the skills link / other nav lives). Add a Settings link button:

```tsx
import { Settings } from "lucide-react";
// …
<Button asChild variant="outline" size="sm">
  <Link href={`/projects/${project.slug}/settings`}>
    <Settings className="size-4" />
    {t("settings.entry")}
  </Link>
</Button>
```

Match the existing header's component usage (it likely already imports `Link`, `Button`, and a `useT`/`t`). Place it next to the existing actions.

- [ ] **Step 4: Type-check**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors (i18n keys are runtime strings; missing keys won't fail tsc — they're added in Task 16).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/note-types/note-types-manager.tsx \
        frontend/src/app/projects/\[slug\]/settings/page.tsx \
        frontend/src/app/projects/\[slug\]/page.tsx
git commit -m "feat: project settings page with note types manager"
```

---

### Task 16: i18n strings

**Files:**
- Create: `frontend/src/i18n/locales/it/noteTypes.ts`, `frontend/src/i18n/locales/en/noteTypes.ts`
- Create: `frontend/src/i18n/locales/it/settings.ts`, `frontend/src/i18n/locales/en/settings.ts`
- Modify: the locale index/aggregator for `it` and `en`

- [ ] **Step 1: Inspect how namespaces are registered**

Open `frontend/src/i18n/locales/it/` aggregator (the file that imports `artifactTypes`, `notes`, etc. — find it: `grep -rl "artifactTypes" src/i18n/locales/it`). Note the exact import + spread/registration shape so the new namespaces match.

- [ ] **Step 2: Create the EN namespaces**

`frontend/src/i18n/locales/en/noteTypes.ts`:

```typescript
export const noteTypes = {
  builtin: "Built-in",
  addType: "Add type",
  addGlobalType: "Add global type",
  project: {
    title: "Project note types",
    description: "Types available only in this project.",
    emptyTitle: "No project types yet",
    emptyDescription: "Add a type to capture notes specific to this project.",
  },
  global: {
    title: "Global note types",
    description: "Shared across every project.",
  },
  dialog: {
    newTitle: "New note type",
    editTitle: "Edit note type",
    description: "Name the type and pick a color.",
    nameLabel: "Name",
    namePlaceholder: "e.g. Risk",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Optional",
    colorLabel: "Color",
    preview: "Preview",
    createType: "Create type",
  },
  deleteDialog: {
    title: 'Delete "{{name}}"?',
    description: "This cannot be undone. Types still used by notes cannot be deleted.",
  },
  toasts: {
    created: "Note type created",
    updated: "Note type updated",
    deleted: "Note type deleted",
    saveError: "Could not save the note type",
    deleteError: "Could not delete the note type",
  },
} as const;
```

`frontend/src/i18n/locales/en/settings.ts`:

```typescript
export const settings = {
  entry: "Settings",
  noteTypes: {
    title: "Note types",
    description: "Add, rename, and recolor the note types used across your notes.",
  },
} as const;
```

- [ ] **Step 3: Create the IT namespaces**

`frontend/src/i18n/locales/it/noteTypes.ts`:

```typescript
export const noteTypes = {
  builtin: "Predefinito",
  addType: "Aggiungi tipo",
  addGlobalType: "Aggiungi tipo globale",
  project: {
    title: "Tipi di nota del progetto",
    description: "Tipi disponibili solo in questo progetto.",
    emptyTitle: "Nessun tipo di progetto",
    emptyDescription: "Aggiungi un tipo per le note specifiche di questo progetto.",
  },
  global: {
    title: "Tipi di nota globali",
    description: "Condivisi tra tutti i progetti.",
  },
  dialog: {
    newTitle: "Nuovo tipo di nota",
    editTitle: "Modifica tipo di nota",
    description: "Assegna un nome al tipo e scegli un colore.",
    nameLabel: "Nome",
    namePlaceholder: "es. Rischio",
    descriptionLabel: "Descrizione",
    descriptionPlaceholder: "Facoltativa",
    colorLabel: "Colore",
    preview: "Anteprima",
    createType: "Crea tipo",
  },
  deleteDialog: {
    title: 'Eliminare "{{name}}"?',
    description: "Operazione irreversibile. I tipi ancora usati dalle note non possono essere eliminati.",
  },
  toasts: {
    created: "Tipo di nota creato",
    updated: "Tipo di nota aggiornato",
    deleted: "Tipo di nota eliminato",
    saveError: "Impossibile salvare il tipo di nota",
    deleteError: "Impossibile eliminare il tipo di nota",
  },
} as const;
```

`frontend/src/i18n/locales/it/settings.ts`:

```typescript
export const settings = {
  entry: "Impostazioni",
  noteTypes: {
    title: "Tipi di nota",
    description: "Aggiungi, rinomina e ricolora i tipi usati nelle tue note.",
  },
} as const;
```

- [ ] **Step 4: Register the namespaces**

In both `it` and `en` aggregator files, import `noteTypes` and `settings` and add them to the exported dictionary exactly as the existing `artifactTypes`/`notes` entries are registered. Match the existing interpolation syntax — if the project uses `{type}` rather than `{{name}}`, adjust the `deleteDialog.title` / toast placeholders accordingly (check an existing entry like `artifactTypes.deleteDialog.title` for the convention; this plan used `{{name}}` to match the artifact-types precedent — confirm and align).

- [ ] **Step 5: Build the frontend**

Run: `cd frontend && pnpm build`
Expected: build succeeds. Fix any missing-import / type errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/i18n/
git commit -m "feat: i18n strings for note types and settings (it/en)"
```

---

## PHASE G — Verification

### Task 17: E2E + full verification

**Files:**
- Create: an E2E spec under the project's existing E2E location (discover it first).

- [ ] **Step 1: Backend full suite**

Run: `cd backend && pytest -q`
Expected: all PASS.

- [ ] **Step 2: Frontend lint + types + build**

Run: `cd frontend && pnpm tsc --noEmit && pnpm build`
Expected: clean.

- [ ] **Step 3: Manual smoke (or Playwright)**

Bring up the stack (`docker-compose up` or the project's dev command). Then verify the flow:
1. Open a project → click **Settings**.
2. Add a PROJECT type "Risk" (color amber) → it appears under Project note types.
3. Open the project **Notes** tab → the composer type picker lists "Risk".
4. Create a note with type "Risk" → the note card shows an amber "Risk" badge, and a "Risk" group appears.
5. Back in Settings → delete "Risk" → expect the in-use **409** toast (a note still uses it).
6. Edit a built-in (e.g. rename "Decision" → "Decisione", recolor) → badge updates everywhere.

If the repo has Playwright E2E (check `frontend` for `playwright.config.*` / an `e2e/` dir), add a spec automating steps 1–4 following the existing E2E conventions; otherwise record the manual smoke result.

- [ ] **Step 4: Final commit (E2E, if added)**

```bash
git add frontend/e2e/ 2>/dev/null || true
git commit -m "test: e2e for configurable note types" || true
```

---

## Self-Review (completed during authoring)

- **Spec coverage:** data model (Task 1–2), migration+backfill+downgrade (Task 2), domain/repo (Task 3), infra (Task 4), schemas (Task 5), service+color validation (Task 6), type resolution / MCP back-compat (Task 7, Task 9), API+409 (Task 8), frontend types/api (Task 10), badge (Task 11), picker/composer/edit (Task 12), tab/filter/card (Task 13), dialogs (Task 14), manager+settings page+entry (Task 15), i18n (Task 16), verification/E2E (Task 17). All spec sections map to a task.
- **Delete guard:** implemented purely via FK `ondelete RESTRICT` → `IntegrityError` → existing global 409 handler; no `ProtectedResourceError` on built-ins (matches the "fully editable + deletable" decision).
- **Back-compat:** `NoteCreate.type` stays a string; built-ins keep `key`; MCP untouched (Task 9 asserts uppercase-key resolution).
- **Type consistency:** `note_type_id` (FK) + `type` (`NoteTypeRef`/`NoteTypeSummary`) names are consistent backend↔frontend; repo `list(note_type_id=…)`, service `resolve(value, project_id)`, picker/badge all use `slug` + `color` + `key` consistently.
- **Known follow-up flagged for the engineer:** confirm the `useT` missing-key contract (Task 11 Step 1) and the i18n interpolation token (`{{name}}` vs `{name}`, Task 16 Step 4) against existing code before finalizing those two files.
