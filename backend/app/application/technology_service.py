"""Technology lookup management: resolve-or-create canonical entries."""

from __future__ import annotations

import uuid

from app.application.slugs import make_unique_slug
from app.domain.entities import Technology
from app.domain.enums import TechnologyKind
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
