"""Domain (bounded context) service."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import Domain
from app.domain.errors import NotFoundError
from app.domain.repositories import DomainRepository, ProjectRepository

_UPDATABLE = {"name", "description", "ubiquitous_language"}


class DomainService:
    def __init__(self, repo: DomainRepository, project_repo: ProjectRepository) -> None:
        self.repo = repo
        self.project_repo = project_repo

    def _require_project_id(self, project_slug: str) -> uuid.UUID:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

    def create(
        self,
        project_slug: str,
        *,
        name: str,
        description: str | None = None,
        ubiquitous_language: dict | None = None,
    ) -> Domain:
        project_id = self._require_project_id(project_slug)
        slug = make_unique_slug(name, lambda s: self.repo.slug_exists(project_id, s))
        return self.repo.add(
            Domain(
                id=uuid.uuid4(),
                project_id=project_id,
                name=name,
                slug=slug,
                description=description,
                ubiquitous_language=ubiquitous_language,
            )
        )

    def get(self, domain_id: uuid.UUID) -> Domain:
        domain = self.repo.get_by_id(domain_id)
        if domain is None:
            raise NotFoundError("domain not found")
        return domain

    def list(self, project_slug: str) -> list[Domain]:
        return self.repo.list(self._require_project_id(project_slug))

    def update(self, domain_id: uuid.UUID, changes: dict) -> Domain:
        domain = self.get(domain_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        return self.repo.update(replace(domain, **applied))

    def delete(self, domain_id: uuid.UUID) -> None:
        self.repo.delete(self.get(domain_id).id)
