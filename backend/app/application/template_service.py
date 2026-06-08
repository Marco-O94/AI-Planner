"""Project templates: CRUD, apply-to-project, and save-project-as-template."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.application.domain_service import DomainService
from app.application.note_service import NoteService
from app.application.project_service import ProjectService
from app.application.skill_service import SkillService
from app.application.slugs import make_unique_slug
from app.application.task_service import TaskService
from app.domain.entities import ProjectTemplate
from app.domain.enums import NoteType, ScopeKind, TaskPriority, TechnologyKind
from app.domain.errors import NotFoundError, ValidationError
from app.domain.read_models import ProjectDetail
from app.domain.repositories import ProjectTemplateRepository

_UPDATABLE = {"name", "description", "definition"}


class ProjectTemplateService:
    def __init__(
        self,
        repo: ProjectTemplateRepository,
        project_service: ProjectService,
        domain_service: DomainService,
        note_service: NoteService,
        task_service: TaskService,
        skill_service: SkillService,
    ) -> None:
        self.repo = repo
        self.project_service = project_service
        self.domain_service = domain_service
        self.note_service = note_service
        self.task_service = task_service
        self.skill_service = skill_service

    # --- CRUD ------------------------------------------------------------

    def create(
        self, *, name: str, definition: dict, description: str | None = None
    ) -> ProjectTemplate:
        slug = make_unique_slug(name, self.repo.slug_exists)
        return self.repo.add(
            ProjectTemplate(
                id=uuid.uuid4(),
                name=name,
                slug=slug,
                description=description,
                definition=definition or {},
            )
        )

    def get(self, template_id: uuid.UUID) -> ProjectTemplate:
        template = self.repo.get_by_id(template_id)
        if template is None:
            raise NotFoundError("template not found")
        return template

    def get_by_slug(self, slug: str) -> ProjectTemplate:
        template = self.repo.get_by_slug(slug)
        if template is None:
            raise NotFoundError(f"template '{slug}' not found")
        return template

    def list(self) -> list[ProjectTemplate]:
        return self.repo.list()

    def update(self, template_id: uuid.UUID, changes: dict) -> ProjectTemplate:
        template = self.get(template_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        return self.repo.update(replace(template, **applied))

    def delete(self, template_id: uuid.UUID) -> None:
        self.repo.delete(self.get(template_id).id)

    # --- materialization -------------------------------------------------

    def apply(self, template_slug: str, project_slug: str) -> ProjectDetail:
        template = self.get_by_slug(template_slug)
        definition = template.definition or {}

        for entry in definition.get("domains", []):
            self.domain_service.create(
                project_slug,
                name=entry["name"],
                description=entry.get("description"),
                ubiquitous_language=entry.get("ubiquitous_language"),
            )
        for tech in definition.get("technologies", []):
            self.project_service.attach_technology(
                project_slug,
                kind=TechnologyKind(tech["kind"]),
                name=tech["name"],
                version=tech.get("version"),
            )
        for skill_id in definition.get("skill_ids", []):
            try:
                self.skill_service.attach(project_slug, uuid.UUID(str(skill_id)))
            except (NotFoundError, ValidationError):
                continue
        for note in definition.get("notes", []):
            self.note_service.create(
                project_slug,
                type=NoteType(note["type"]),
                content=note["content"],
                title=note.get("title"),
                tags=note.get("tags"),
            )
        for task in definition.get("tasks", []):
            self.task_service.create(
                project_slug,
                title=task["title"],
                description=task.get("description"),
                priority=TaskPriority(task.get("priority", "MEDIUM")),
                tags=task.get("tags"),
            )
        return self.project_service.get_detail(project_slug)

    def save_as_template(
        self, project_slug: str, *, name: str, description: str | None = None
    ) -> ProjectTemplate:
        detail = self.project_service.get_detail(project_slug)
        domains = self.domain_service.list(project_slug)
        notes = self.note_service.list(project_slug)
        tasks = self.task_service.list(project_slug)
        skills = self.skill_service.list_applicable(project_slug)

        definition = {
            "domains": [
                {
                    "name": d.name,
                    "description": d.description,
                    "ubiquitous_language": d.ubiquitous_language,
                }
                for d in domains
            ],
            "technologies": [
                {"kind": str(t.kind), "name": t.name, "version": t.version}
                for t in detail.technologies
            ],
            "skill_ids": [str(s.id) for s in skills if s.scope == ScopeKind.GLOBAL],
            "notes": [
                {"type": str(n.type), "title": n.title, "content": n.content, "tags": n.tags}
                for n in notes
            ],
            "tasks": [
                {
                    "title": t.task.title,
                    "description": t.task.description,
                    "priority": str(t.task.priority),
                    "tags": t.task.tags,
                }
                for t in tasks
            ],
        }
        return self.create(name=name, definition=definition, description=description)
