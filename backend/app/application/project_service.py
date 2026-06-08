"""Project aggregate service: CRUD, filtering, and technology attachment."""

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.application.technology_service import TechnologyService
from app.domain.entities import Project
from app.domain.enums import ProjectStatus, TechnologyKind
from app.domain.errors import NotFoundError
from app.domain.read_models import ProjectDetail, ProjectTechnologyRef
from app.domain.repositories import ProjectRepository

_UPDATABLE = {"name", "description", "status", "repository_url", "metadata"}


class ProjectService:
    def __init__(self, repo: ProjectRepository, technology_service: TechnologyService) -> None:
        self.repo = repo
        self.tech = technology_service

    def _require(self, slug: str) -> Project:
        project = self.repo.get_by_slug(slug)
        if project is None:
            raise NotFoundError(f"project '{slug}' not found")
        return project

    def create(
        self,
        *,
        name: str,
        description: str | None = None,
        status: ProjectStatus = ProjectStatus.ACTIVE,
        repository_url: str | None = None,
        metadata: dict | None = None,
        technologies: list[dict] | None = None,
    ) -> ProjectDetail:
        slug = make_unique_slug(name, self.repo.slug_exists)
        project = self.repo.add(
            Project(
                id=uuid.uuid4(),
                name=name,
                slug=slug,
                status=status,
                description=description,
                repository_url=repository_url,
                metadata=metadata,
            )
        )
        for tech in technologies or []:
            resolved = self.tech.resolve_or_create(TechnologyKind(tech["kind"]), tech["name"])
            self.repo.attach_technology(project.id, resolved.id, tech.get("version"))
        return self.repo.get_detail_by_slug(slug)

    def get_detail(self, slug: str) -> ProjectDetail:
        detail = self.repo.get_detail_by_slug(slug)
        if detail is None:
            raise NotFoundError(f"project '{slug}' not found")
        return detail

    def list(self, **filters) -> list[ProjectDetail]:
        return self.repo.list(**filters)

    def update(self, slug: str, changes: dict) -> ProjectDetail:
        project = self._require(slug)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        self.repo.update(replace(project, **applied))
        return self.repo.get_detail_by_slug(project.slug)

    def delete(self, slug: str) -> None:
        project = self._require(slug)
        self.repo.delete(project.id)

    def attach_technology(
        self, slug: str, *, kind: TechnologyKind, name: str, version: str | None
    ) -> ProjectDetail:
        project = self._require(slug)
        resolved = self.tech.resolve_or_create(kind, name)
        self.repo.attach_technology(project.id, resolved.id, version)
        return self.repo.get_detail_by_slug(slug)

    def detach_technology(self, slug: str, technology_id: uuid.UUID) -> ProjectDetail:
        project = self._require(slug)
        self.repo.detach_technology(project.id, technology_id)
        return self.repo.get_detail_by_slug(slug)

    def list_technologies(self, slug: str) -> list[ProjectTechnologyRef]:
        project = self._require(slug)
        return self.repo.list_technologies(project.id)
