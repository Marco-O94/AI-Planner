"""NoteType service: scope<->project invariant + color validation."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import NoteTypeEntity
from app.domain.enums import NOTE_TYPE_COLORS, ScopeKind
from app.domain.errors import NotFoundError, ProtectedResourceError, ValidationError
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
        note_type = self.get(type_id)  # 404 if missing
        if note_type.is_default:
            raise ProtectedResourceError("the default note type cannot be deleted")
        # FK ondelete RESTRICT raises IntegrityError when notes still reference it,
        # mapped to HTTP 409 by the global handler.
        self.repo.delete(type_id)
