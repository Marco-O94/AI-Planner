"""Technology lookup management: resolve-or-create canonical entries."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import Technology
from app.domain.enums import TechnologyKind
from app.domain.errors import ConflictError, NotFoundError
from app.domain.repositories import TechnologyRepository


class TechnologyService:
    def __init__(self, repo: TechnologyRepository) -> None:
        self.repo = repo

    def resolve_or_create(self, kind: TechnologyKind, name: str) -> Technology:
        existing = self.repo.find_by_kind_name(kind, name)
        if existing is not None:
            return existing
        slug = make_unique_slug(name, lambda candidate: self.repo.slug_exists(kind, candidate))
        return self.repo.add(Technology(id=uuid.uuid4(), kind=kind, name=name, slug=slug))

    def create(self, kind: TechnologyKind, name: str) -> Technology:
        # Canonical creation is idempotent: reuse an existing (kind, name) entry.
        return self.resolve_or_create(kind, name)

    def list(self, *, kind: TechnologyKind | None = None) -> list[Technology]:
        return self.repo.list(kind=kind)

    def get(self, technology_id: uuid.UUID) -> Technology:
        technology = self.repo.get_by_id(technology_id)
        if technology is None:
            raise NotFoundError("technology not found")
        return technology

    def update(
        self,
        technology_id: uuid.UUID,
        *,
        kind: TechnologyKind | None = None,
        name: str | None = None,
    ) -> Technology:
        current = self.get(technology_id)
        target_kind = kind if kind is not None else current.kind
        target_name = name if name is not None else current.name

        kind_changed = target_kind != current.kind
        name_changed = target_name != current.name
        target_slug = current.slug

        if name_changed or kind_changed:
            # A different existing row already owns this (kind, name): block (no merge).
            existing = self.repo.find_by_kind_name(target_kind, target_name)
            if existing is not None and existing.id != current.id:
                raise ConflictError("a technology with that name already exists")
            # Re-slug under the target kind. The unique key is (kind, slug), so a
            # kind change moves the row and a name change derives a fresh slug.
            target_slug = make_unique_slug(
                target_name,
                lambda candidate: self.repo.slug_exists(target_kind, candidate),
            )

        return self.repo.update(
            replace(current, kind=target_kind, name=target_name, slug=target_slug)
        )

    def delete(self, technology_id: uuid.UUID) -> None:
        # The only delete guard is the project_technologies.technology_id FK
        # (ondelete RESTRICT), which raises IntegrityError when the technology is
        # attached to any project, mapped to HTTP 409 by the global handler.
        self.get(technology_id)  # 404 if missing
        self.repo.delete(technology_id)
