"""ArtifactType service: scope<->project invariant + protected default."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import ArtifactType
from app.domain.enums import ScopeKind
from app.domain.errors import NotFoundError, ProtectedResourceError, ValidationError
from app.domain.repositories import ArtifactTypeRepository, ProjectRepository

_UPDATABLE = {"name", "description", "instructions", "output_files"}


class ArtifactTypeService:
    def __init__(self, repo: ArtifactTypeRepository, project_repo: ProjectRepository) -> None:
        self.repo = repo
        self.project_repo = project_repo

    def _resolve_project_id(self, project_slug: str | None) -> uuid.UUID | None:
        if project_slug is None:
            return None
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

    def create(
        self,
        *,
        scope: ScopeKind,
        name: str,
        instructions: str,
        description: str | None = None,
        output_files: list[dict] | None = None,
        project_slug: str | None = None,
    ) -> ArtifactType:
        if scope == ScopeKind.GLOBAL and project_slug is not None:
            raise ValidationError("a GLOBAL artifact type must not target a project")
        if scope == ScopeKind.PROJECT and project_slug is None:
            raise ValidationError("a PROJECT artifact type requires a project")
        project_id = self._resolve_project_id(project_slug)
        slug = make_unique_slug(name, lambda s: self.repo.slug_exists(s, project_id))
        return self.repo.add(
            ArtifactType(
                id=uuid.uuid4(),
                scope=scope,
                project_id=project_id,
                name=name,
                slug=slug,
                description=description,
                instructions=instructions,
                output_files=output_files or [],
                is_default=False,
            )
        )

    def get(self, type_id: uuid.UUID) -> ArtifactType:
        artifact_type = self.repo.get_by_id(type_id)
        if artifact_type is None:
            raise NotFoundError("artifact type not found")
        return artifact_type

    def list(self, *, scope: ScopeKind | None = None) -> list[ArtifactType]:
        return self.repo.list(scope=scope)

    def list_applicable(self, project_slug: str) -> list[ArtifactType]:
        project_id = self._resolve_project_id(project_slug)
        return self.repo.list_applicable(project_id)

    def update(self, type_id: uuid.UUID, changes: dict) -> ArtifactType:
        artifact_type = self.get(type_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        return self.repo.update(replace(artifact_type, **applied))

    def delete(self, type_id: uuid.UUID) -> None:
        artifact_type = self.get(type_id)
        if artifact_type.is_default:
            raise ProtectedResourceError("the default artifact type cannot be deleted")
        self.repo.delete(type_id)
