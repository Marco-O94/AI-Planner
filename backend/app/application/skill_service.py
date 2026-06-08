"""Skill service: scope<->project invariant and GLOBAL-skill attachment."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.slugs import make_unique_slug
from app.domain.entities import Skill
from app.domain.enums import ScopeKind
from app.domain.errors import NotFoundError, ValidationError
from app.domain.repositories import ProjectRepository, SkillRepository

_UPDATABLE = {"name", "description", "content", "tags"}


class SkillService:
    def __init__(self, repo: SkillRepository, project_repo: ProjectRepository) -> None:
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
        description: str,
        content: str,
        tags: list[str] | None = None,
        project_slug: str | None = None,
    ) -> Skill:
        if scope == ScopeKind.GLOBAL and project_slug is not None:
            raise ValidationError("a GLOBAL skill must not target a project")
        if scope == ScopeKind.PROJECT and project_slug is None:
            raise ValidationError("a PROJECT skill requires a project")
        project_id = self._resolve_project_id(project_slug)
        slug = make_unique_slug(name, lambda s: self.repo.slug_exists(s, project_id))
        return self.repo.add(
            Skill(
                id=uuid.uuid4(),
                scope=scope,
                project_id=project_id,
                name=name,
                slug=slug,
                description=description,
                content=content,
                tags=tags or [],
            )
        )

    def get(self, skill_id: uuid.UUID) -> Skill:
        skill = self.repo.get_by_id(skill_id)
        if skill is None:
            raise NotFoundError("skill not found")
        return skill

    def list(self, *, scope: ScopeKind | None = None, tag: str | None = None) -> list[Skill]:
        return self.repo.list(scope=scope, tag=tag)

    def list_applicable(self, project_slug: str) -> list[Skill]:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return self.repo.list_applicable(project.id)

    def update(self, skill_id: uuid.UUID, changes: dict) -> Skill:
        skill = self.get(skill_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        return self.repo.update(replace(skill, **applied))

    def delete(self, skill_id: uuid.UUID) -> None:
        self.repo.delete(self.get(skill_id).id)

    def attach(self, project_slug: str, skill_id: uuid.UUID) -> None:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        skill = self.get(skill_id)
        if skill.scope != ScopeKind.GLOBAL:
            raise ValidationError("only GLOBAL skills can be attached to a project")
        self.repo.attach(project.id, skill_id)

    def detach(self, project_slug: str, skill_id: uuid.UUID) -> None:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        self.repo.detach(project.id, skill_id)
