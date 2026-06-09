# Configurable Note Types — Design

**Date:** 2026-06-09
**Status:** Approved (design)
**Area:** backend (DB + API) · MCP · frontend (`/projects/[slug]/settings`)

## Problem

Note types are a fixed native Postgres enum (`note_type`) with 6 values
(`REQUIREMENT`, `CONSTRAINT`, `DECISION`, `QUESTION`, `SNIPPET`, `REFERENCE`).
Users cannot add new types or edit existing ones. We want a Settings surface where
users add new note types and modify existing ones (label + color), scoped both
globally and per-project.

## Decisions (locked)

1. **Scope:** Global + per-project, mirroring the existing `artifact_types` table
   (`ScopeKind` = `GLOBAL` / `PROJECT`).
2. **Built-ins:** The 6 current types are seeded as `GLOBAL` rows (`is_default=true`)
   and are **fully editable and deletable** (subject to the in-use guard).
3. **Delete guard:** Deleting a type that any note still references is **blocked**
   (FK `ondelete RESTRICT` → surfaced as HTTP 409). No reassign/soft-delete.
4. **Color:** Chosen from the existing 7-tone design palette
   (`violet`, `blue`, `green`, `amber`, `red`, `slate`, `neutral`), validated
   server-side. Stored as the tone name.
5. **Settings UI:** New route `/projects/[slug]/settings` with a "Note Types" section.

## Architecture

The codebase is layered DDD: `schemas` (DTO) → `api/routers` → `application` services
→ `domain` (entities, repository protocols, errors) → `infrastructure` (SQLAlchemy
models + repo implementations), wired through `api/deps`. The new feature mirrors the
existing `artifact_types` vertical slice end-to-end.

### 1. Data model

New table **`note_types`** (mirrors `artifact_types`):

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `scope` | `scope_kind` enum | `GLOBAL` / `PROJECT` (reuses existing enum) |
| `project_id` | UUID FK→projects, `ondelete CASCADE` | NULL for GLOBAL |
| `key` | text, nullable | stable identifier; built-ins keep `"REQUIREMENT"` etc.; NULL for custom |
| `name` | text | display label |
| `slug` | text | lowercase; uniqueness + lookups |
| `color` | text | one of the 7 tone names; validated in service |
| `description` | text, nullable | |
| `is_default` | bool, default false | true for the 6 seeded built-ins |
| `created_at` / `updated_at` | timestamptz | via `TimestampMixin` |

Constraints (copied from `artifact_types`):
- `ck_note_types_scope_project`: `(scope='GLOBAL' AND project_id IS NULL) OR (scope='PROJECT' AND project_id IS NOT NULL)`
- `uq_note_types_global_slug`: unique `slug` where `project_id IS NULL`
- `uq_note_types_project_slug`: unique `(project_id, slug)` where `project_id IS NOT NULL`

**`notes` table change:** replace `type` (pg enum column) with
`note_type_id UUID NOT NULL` FK → `note_types.id`, **`ondelete RESTRICT`** (this FK
is the delete guard).

### 2. Migration (Alembic)

1. Create `note_types` table + its constraints.
2. Seed the 6 built-ins as `GLOBAL`, `is_default=true`, `key` = old enum value,
   `slug` = lowercased value, `name` = English label, `color` from today's
   `NOTE_TYPE_TONE` map (`REQUIREMENT→violet`, `CONSTRAINT→red`, `DECISION→green`,
   `QUESTION→amber`, `SNIPPET→blue`, `REFERENCE→slate`).
3. Add nullable `notes.note_type_id`.
4. Backfill: `note_type_id` = the GLOBAL `note_types.id` whose `key` matches the
   note's old enum `type`.
5. Set `notes.note_type_id` NOT NULL; add FK (`ondelete RESTRICT`).
6. Drop `notes.type` column, then drop the now-unused `note_type` pg enum type.

Downgrade reverses: recreate enum, re-add `type`, backfill from `note_type_id.key`,
drop FK/column/table.

### 3. Backend (mirror artifact_type slice)

- **domain/entities:** add `NoteType` entity (id, scope, project_id, key, name, slug,
  color, description, is_default, timestamps). Rename the existing enum usage:
  the old `NoteType` *StrEnum* in `domain/enums.py` is retained only as the canonical
  seed/built-in key list (used by the migration + color seeding); it no longer types a
  DB column. `Note` entity: `type: NoteTypeEnum` → `note_type_id: UUID` plus a resolved
  `type` summary for reads.
- **domain/repositories:** add `NoteTypeRepository` protocol (`add`, `get_by_id`,
  `list(scope)`, `list_applicable(project_id)`, `get_by_slug_or_key(value, project_id)`,
  `slug_exists`, `update`, `delete`).
- **infrastructure:** `NoteType` ORM model; `SqlAlchemyNoteTypeRepository`. Note repo
  joins/loads the type for reads.
- **application/note_type_service.py:** CRUD with scope/project invariant (copied from
  `ArtifactTypeService`) **plus color validation** (`color ∈ palette`, else
  `ValidationError`). Built-ins are editable (no `ProtectedResourceError` on update or
  delete — only the FK RESTRICT blocks deletes that are in use). Delete catches the DB
  `IntegrityError` and raises a domain error mapped to **409**.
- **application/note_service.py:** `create`/`update`/`list` resolve the incoming type
  **string** (key or slug) to a `note_type_id` within the project's applicable set
  (GLOBAL + that project's PROJECT types); unknown value → `ValidationError`.
- **schemas/note_type.py:** `NoteTypeCreate` (scope, name, color, description?,
  project_slug?), `NoteTypeUpdate` (name?, color?, description?), `NoteTypeRead`
  (id, scope, project_id, key, name, slug, color, description, is_default, timestamps).
- **schemas/note.py:** `NoteCreate.type` / `NoteUpdate.type` stay **`str`** (the type's
  key or slug — back-compatible). `NoteRead` drops the enum `type` and gains a nested
  compact `type: NoteTypeSummary` (`{id, key, slug, name, color}`).
- **api/routers/note_types.py:** mirror `artifact_types.py` — `/note-types` list/create,
  `/note-types/{id}` get/patch/delete, `/projects/{slug}/note-types` applicable list.
  Map the delete-in-use domain error → 409.
- **api/routers/notes.py:** `list_notes` `type` filter changes from `NoteType | None`
  (enum) to `str | None` (slug/key), resolved in the service.
- **api/deps + errors mapping:** wire the new service/repo; add 409 mapping for the
  in-use delete error.

### 4. MCP

No change required. `create_note` already sends the type as the string `"REQUIREMENT"`
etc.; because built-ins keep `key="REQUIREMENT"`, server-side resolution succeeds
unchanged. Note formatting that prints the type label keeps working (string).

### 5. Frontend

- **lib/types.ts:** add `NOTE_TYPE_COLORS` (the 7 tone names) + `NoteTypeColor`;
  `NoteTypeRead` / `NoteTypeCreate` / `NoteTypeUpdate` interfaces; change `NoteRead.type`
  to the nested summary `{ id, key, slug, name, color }`. Keep a thin legacy alias only
  where needed for the migration of call sites.
- **lib/api.ts:** `listNoteTypes(scope?)`, `listProjectNoteTypes(slug)`,
  `createNoteType`, `updateNoteType`, `deleteNoteType` (409 → typed error).
- **status-badge.tsx:** `NoteTypeBadge` takes the type object; tone = `type.color`;
  label = `type.key ? t('enums.noteType.'+type.key, { default: type.name }) : type.name`.
  This preserves the existing IT/EN translations for built-ins and uses the stored
  `name` for custom types.
- **note-form-fields.tsx / quick-note-composer / edit dialog:** the type picker fetches
  the project's applicable types (SWR) instead of the static `NOTE_TYPES`; the form value
  is the type's `slug`/`key` string; default = first applicable type.
- **notes-filter-bar.tsx:** filter options come from the project's applicable types.
- **New `app/projects/[slug]/settings/page.tsx`** + `components/settings/note-types-manager.tsx`:
  expandable table rows listing GLOBAL + this project's PROJECT types; add/edit dialog
  (name, tone color picker, description, GLOBAL/PROJECT scope); delete with in-use block
  (409 → toast naming the blocking note count). Entry point: a Settings link/button on
  the project page header.
- **i18n:** add `settings.*` and `noteTypes.*` keys (IT + EN); keep existing
  `enums.noteType.*` for built-in fallback labels.

## Error handling

- Create/update with a color outside the palette → 422/400 `ValidationError`.
- Create PROJECT type without project (or GLOBAL with project) → 400 `ValidationError`.
- Duplicate slug within scope → 409 (unique index) mapped to a clear message.
- Delete a type still used by notes → **409** with the in-use count.
- Note create/update with an unknown type string → 400 `ValidationError`.

## Testing

**Backend**
- Migration: table created; 6 built-ins seeded with correct key/slug/color; backfill
  maps every existing note; downgrade restores enum.
- `note_type_service`: CRUD; scope/project invariant; color validation; slug uniqueness;
  delete blocked (409) when in use; delete allowed when unused (incl. a built-in).
- `note_service`: resolves type by key and by slug within GLOBAL+PROJECT set; rejects
  unknown; PROJECT type from another project is not resolvable.
- Router: `/note-types` CRUD; `/projects/{slug}/note-types`; notes list `type` filter by
  slug; 409 on in-use delete.

**Frontend**
- `note-types-manager`: add, edit (label+color), delete; in-use delete shows blocked toast.
- `NoteTypeBadge`: renders stored tone color; built-in shows translated label, custom
  shows stored name.
- composer/filter use dynamic types.

**E2E (Playwright)**
- Settings → add a PROJECT type → it appears in the composer type picker → create a note
  with it → badge shows the chosen color.

## Out of scope (YAGNI)

- Custom icons per type.
- Free hex colors.
- Reassign-on-delete and soft-delete.
- A global (app-wide, non-project) settings screen — global types are managed from within
  a project's settings page.
