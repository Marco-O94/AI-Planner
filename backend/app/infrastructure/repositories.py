"""SQLAlchemy-backed repository implementations.

Each repository wraps a Session and maps between ORM rows and domain entities.
Repositories flush (so server-generated values are available) but do not commit;
the unit of work is committed at the API boundary (see app/infrastructure/db.py).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.domain import entities as e
from app.domain.enums import (
    ProjectStatus,
    ScopeKind,
    TaskPriority,
    TaskStatus,
    TechnologyKind,
)
from app.domain.errors import NotFoundError
from app.domain.read_models import ProjectDetail, ProjectTechnologyRef
from app.domain.search import IndexableFile
from app.infrastructure import mappers
from app.infrastructure import models as m


class SqlProjectRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, project: e.Project) -> e.Project:
        orm = m.Project(
            id=project.id,
            name=project.name,
            slug=project.slug,
            status=project.status,
            description=project.description,
            repository_url=project.repository_url,
            project_metadata=project.metadata,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.project_to_domain(orm)

    def get_by_id(self, project_id: uuid.UUID) -> e.Project | None:
        orm = self.db.get(m.Project, project_id)
        return mappers.project_to_domain(orm) if orm else None

    def get_by_slug(self, slug: str) -> e.Project | None:
        orm = self.db.scalar(select(m.Project).where(m.Project.slug == slug))
        return mappers.project_to_domain(orm) if orm else None

    def get_detail_by_slug(self, slug: str) -> ProjectDetail | None:
        orm = self.db.scalar(select(m.Project).where(m.Project.slug == slug))
        return self._detail(orm) if orm else None

    def update(self, project: e.Project) -> e.Project:
        orm = self.db.get(m.Project, project.id)
        if orm is None:
            raise NotFoundError("project not found")
        orm.name = project.name
        orm.slug = project.slug
        orm.status = project.status
        orm.description = project.description
        orm.repository_url = project.repository_url
        orm.project_metadata = project.metadata
        self.db.flush()
        self.db.refresh(orm)
        return mappers.project_to_domain(orm)

    def delete(self, project_id: uuid.UUID) -> None:
        orm = self.db.get(m.Project, project_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, slug: str) -> bool:
        return self.db.scalar(select(m.Project.id).where(m.Project.slug == slug)) is not None

    def list(
        self,
        *,
        search: str | None = None,
        language: str | None = None,
        framework: str | None = None,
        database: str | None = None,
        status: ProjectStatus | None = None,
    ) -> list[ProjectDetail]:
        stmt = select(m.Project)
        if status is not None:
            stmt = stmt.where(m.Project.status == status)
        if search:
            like = f"%{search}%"
            stmt = stmt.where(or_(m.Project.name.ilike(like), m.Project.description.ilike(like)))
        for value, kind in (
            (language, TechnologyKind.LANGUAGE),
            (framework, TechnologyKind.FRAMEWORK),
            (database, TechnologyKind.DATABASE),
        ):
            if value:
                sub = (
                    select(m.ProjectTechnology.project_id)
                    .join(m.Technology, m.Technology.id == m.ProjectTechnology.technology_id)
                    .where(m.Technology.kind == kind, m.Technology.name == value)
                )
                stmt = stmt.where(m.Project.id.in_(sub))
        stmt = stmt.order_by(m.Project.created_at.desc())
        return [self._detail(p) for p in self.db.scalars(stmt).all()]

    def attach_technology(
        self, project_id: uuid.UUID, technology_id: uuid.UUID, version: str | None
    ) -> None:
        existing = self.db.get(m.ProjectTechnology, (project_id, technology_id))
        if existing is None:
            self.db.add(
                m.ProjectTechnology(
                    project_id=project_id, technology_id=technology_id, version=version
                )
            )
        else:
            existing.version = version
        self.db.flush()

    def detach_technology(self, project_id: uuid.UUID, technology_id: uuid.UUID) -> None:
        existing = self.db.get(m.ProjectTechnology, (project_id, technology_id))
        if existing is not None:
            self.db.delete(existing)
            self.db.flush()

    def list_technologies(self, project_id: uuid.UUID) -> list[ProjectTechnologyRef]:
        rows = self.db.execute(
            select(m.Technology, m.ProjectTechnology.version)
            .join(m.ProjectTechnology, m.ProjectTechnology.technology_id == m.Technology.id)
            .where(m.ProjectTechnology.project_id == project_id)
            .order_by(m.Technology.kind, m.Technology.name)
        ).all()
        return [
            ProjectTechnologyRef(id=t.id, kind=t.kind, name=t.name, slug=t.slug, version=v)
            for t, v in rows
        ]

    def _count(self, model: type, project_id: uuid.UUID) -> int:
        return self.db.scalar(
            select(func.count()).select_from(model).where(model.project_id == project_id)
        )

    def _unprocessed_note_count(self, project_id: uuid.UUID) -> int:
        # AI-processed notes are "done" knowledge — exclude them so the count
        # reflects what still needs actioning.
        return self.db.scalar(
            select(func.count())
            .select_from(m.Note)
            .where(m.Note.project_id == project_id, m.Note.ai_processed_at.is_(None))
        )

    def _detail(self, orm: m.Project) -> ProjectDetail:
        return ProjectDetail(
            project=mappers.project_to_domain(orm),
            technologies=self.list_technologies(orm.id),
            note_count=self._unprocessed_note_count(orm.id),
            task_count=self._count(m.Task, orm.id),
            artifact_count=self._count(m.Artifact, orm.id),
        )


class SqlTechnologyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, technology: e.Technology) -> e.Technology:
        orm = m.Technology(
            id=technology.id, kind=technology.kind, name=technology.name, slug=technology.slug
        )
        self.db.add(orm)
        self.db.flush()
        return mappers.technology_to_domain(orm)

    def get_by_id(self, technology_id: uuid.UUID) -> e.Technology | None:
        orm = self.db.get(m.Technology, technology_id)
        return mappers.technology_to_domain(orm) if orm else None

    def find_by_kind_name(self, kind: TechnologyKind, name: str) -> e.Technology | None:
        orm = self.db.scalar(
            select(m.Technology).where(
                m.Technology.kind == kind, func.lower(m.Technology.name) == name.lower()
            )
        )
        return mappers.technology_to_domain(orm) if orm else None

    def slug_exists(self, kind: TechnologyKind, slug: str) -> bool:
        return (
            self.db.scalar(
                select(m.Technology.id).where(
                    m.Technology.kind == kind, m.Technology.slug == slug
                )
            )
            is not None
        )

    def list(self, *, kind: TechnologyKind | None = None) -> list[e.Technology]:
        stmt = select(m.Technology)
        if kind is not None:
            stmt = stmt.where(m.Technology.kind == kind)
        stmt = stmt.order_by(m.Technology.kind, m.Technology.name)
        return [mappers.technology_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, technology: e.Technology) -> e.Technology:
        orm = self.db.get(m.Technology, technology.id)
        if orm is None:
            raise NotFoundError("technology not found")
        orm.kind = technology.kind
        orm.name = technology.name
        orm.slug = technology.slug
        self.db.flush()
        self.db.refresh(orm)
        return mappers.technology_to_domain(orm)

    def delete(self, technology_id: uuid.UUID) -> None:
        orm = self.db.get(m.Technology, technology_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()


class SqlDomainRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, domain: e.Domain) -> e.Domain:
        orm = m.Domain(
            id=domain.id,
            project_id=domain.project_id,
            name=domain.name,
            slug=domain.slug,
            description=domain.description,
            ubiquitous_language=domain.ubiquitous_language,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.domain_to_domain(orm)

    def get_by_id(self, domain_id: uuid.UUID) -> e.Domain | None:
        orm = self.db.get(m.Domain, domain_id)
        return mappers.domain_to_domain(orm) if orm else None

    def get_by_slug(self, project_id: uuid.UUID, slug: str) -> e.Domain | None:
        orm = self.db.scalar(
            select(m.Domain).where(m.Domain.project_id == project_id, m.Domain.slug == slug)
        )
        return mappers.domain_to_domain(orm) if orm else None

    def list(self, project_id: uuid.UUID) -> list[e.Domain]:
        stmt = select(m.Domain).where(m.Domain.project_id == project_id).order_by(m.Domain.name)
        return [mappers.domain_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, domain: e.Domain) -> e.Domain:
        orm = self.db.get(m.Domain, domain.id)
        if orm is None:
            raise NotFoundError("domain not found")
        orm.name = domain.name
        orm.slug = domain.slug
        orm.description = domain.description
        orm.ubiquitous_language = domain.ubiquitous_language
        self.db.flush()
        self.db.refresh(orm)
        return mappers.domain_to_domain(orm)

    def delete(self, domain_id: uuid.UUID) -> None:
        orm = self.db.get(m.Domain, domain_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, project_id: uuid.UUID, slug: str) -> bool:
        return (
            self.db.scalar(
                select(m.Domain.id).where(
                    m.Domain.project_id == project_id, m.Domain.slug == slug
                )
            )
            is not None
        )


class SqlNoteRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

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

    def get_by_id(self, note_id: uuid.UUID) -> e.Note | None:
        orm = self.db.get(m.Note, note_id)
        return mappers.note_to_domain(orm) if orm else None

    def update(self, note: e.Note) -> e.Note:
        orm = self.db.get(m.Note, note.id)
        if orm is None:
            raise NotFoundError("note not found")
        orm.domain_id = note.domain_id
        orm.note_type_id = note.note_type_id
        orm.title = note.title
        orm.content = note.content
        orm.tags = note.tags
        orm.ai_processed_at = note.ai_processed_at
        self.db.flush()
        self.db.refresh(orm)
        return mappers.note_to_domain(orm)

    def delete(self, note_id: uuid.UUID) -> None:
        orm = self.db.get(m.Note, note_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def list_all(self) -> list[e.Note]:
        return [mappers.note_to_domain(o) for o in self.db.scalars(select(m.Note)).all()]

    def list(
        self,
        project_id: uuid.UUID,
        *,
        domain_id: uuid.UUID | None = None,
        note_type_id: uuid.UUID | None = None,
        tag: str | None = None,
        processed: bool | None = None,
    ) -> list[e.Note]:
        stmt = select(m.Note).where(m.Note.project_id == project_id)
        if domain_id is not None:
            stmt = stmt.where(m.Note.domain_id == domain_id)
        if note_type_id is not None:
            stmt = stmt.where(m.Note.note_type_id == note_type_id)
        if tag is not None:
            stmt = stmt.where(m.Note.tags.any(tag))
        if processed is True:
            stmt = stmt.where(m.Note.ai_processed_at.isnot(None))
        elif processed is False:
            stmt = stmt.where(m.Note.ai_processed_at.is_(None))
        stmt = stmt.order_by(m.Note.created_at.desc())
        return [mappers.note_to_domain(o) for o in self.db.scalars(stmt).all()]


class SqlTaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, task: e.Task) -> e.Task:
        orm = m.Task(
            id=task.id,
            project_id=task.project_id,
            domain_id=task.domain_id,
            source_note_id=task.source_note_id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            depends_on=task.depends_on,
            tags=task.tags,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.task_to_domain(orm)

    def get_by_id(self, task_id: uuid.UUID) -> e.Task | None:
        orm = self.db.get(m.Task, task_id)
        return mappers.task_to_domain(orm) if orm else None

    def get_many(self, task_ids: list[uuid.UUID]) -> list[e.Task]:
        if not task_ids:
            return []
        stmt = select(m.Task).where(m.Task.id.in_(task_ids))
        return [mappers.task_to_domain(o) for o in self.db.scalars(stmt).all()]

    def list_all_for_project(self, project_id: uuid.UUID) -> list[e.Task]:
        stmt = select(m.Task).where(m.Task.project_id == project_id)
        return [mappers.task_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, task: e.Task) -> e.Task:
        orm = self.db.get(m.Task, task.id)
        if orm is None:
            raise NotFoundError("task not found")
        orm.domain_id = task.domain_id
        orm.title = task.title
        orm.description = task.description
        orm.status = task.status
        orm.priority = task.priority
        orm.depends_on = task.depends_on
        orm.tags = task.tags
        self.db.flush()
        self.db.refresh(orm)
        return mappers.task_to_domain(orm)

    def delete(self, task_id: uuid.UUID) -> None:
        orm = self.db.get(m.Task, task_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def list(
        self,
        project_id: uuid.UUID,
        *,
        domain_id: uuid.UUID | None = None,
        status: TaskStatus | None = None,
        priority: TaskPriority | None = None,
        tag: str | None = None,
    ) -> list[e.Task]:
        stmt = select(m.Task).where(m.Task.project_id == project_id)
        if domain_id is not None:
            stmt = stmt.where(m.Task.domain_id == domain_id)
        if status is not None:
            stmt = stmt.where(m.Task.status == status)
        if priority is not None:
            stmt = stmt.where(m.Task.priority == priority)
        if tag is not None:
            stmt = stmt.where(m.Task.tags.any(tag))
        stmt = stmt.order_by(m.Task.created_at.desc())
        return [mappers.task_to_domain(o) for o in self.db.scalars(stmt).all()]


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


class SqlArtifactTypeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, artifact_type: e.ArtifactType) -> e.ArtifactType:
        orm = m.ArtifactType(
            id=artifact_type.id,
            scope=artifact_type.scope,
            project_id=artifact_type.project_id,
            name=artifact_type.name,
            slug=artifact_type.slug,
            description=artifact_type.description,
            instructions=artifact_type.instructions,
            output_files=artifact_type.output_files,
            is_default=artifact_type.is_default,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_type_to_domain(orm)

    def get_by_id(self, type_id: uuid.UUID) -> e.ArtifactType | None:
        orm = self.db.get(m.ArtifactType, type_id)
        return mappers.artifact_type_to_domain(orm) if orm else None

    def get_by_slug(self, slug: str, project_id: uuid.UUID | None) -> e.ArtifactType | None:
        stmt = select(m.ArtifactType).where(m.ArtifactType.slug == slug)
        stmt = stmt.where(
            m.ArtifactType.project_id == project_id
            if project_id is not None
            else m.ArtifactType.project_id.is_(None)
        )
        orm = self.db.scalar(stmt)
        return mappers.artifact_type_to_domain(orm) if orm else None

    def list(self, *, scope: ScopeKind | None = None) -> list[e.ArtifactType]:
        stmt = select(m.ArtifactType)
        if scope is not None:
            stmt = stmt.where(m.ArtifactType.scope == scope)
        stmt = stmt.order_by(m.ArtifactType.name)
        return [mappers.artifact_type_to_domain(o) for o in self.db.scalars(stmt).all()]

    def list_applicable(self, project_id: uuid.UUID) -> list[e.ArtifactType]:
        stmt = (
            select(m.ArtifactType)
            .where(
                or_(
                    m.ArtifactType.scope == ScopeKind.GLOBAL,
                    m.ArtifactType.project_id == project_id,
                )
            )
            .order_by(m.ArtifactType.name)
        )
        return [mappers.artifact_type_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, artifact_type: e.ArtifactType) -> e.ArtifactType:
        orm = self.db.get(m.ArtifactType, artifact_type.id)
        if orm is None:
            raise NotFoundError("artifact type not found")
        orm.name = artifact_type.name
        orm.slug = artifact_type.slug
        orm.description = artifact_type.description
        orm.instructions = artifact_type.instructions
        orm.output_files = artifact_type.output_files
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_type_to_domain(orm)

    def delete(self, type_id: uuid.UUID) -> None:
        orm = self.db.get(m.ArtifactType, type_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, slug: str, project_id: uuid.UUID | None) -> bool:
        return self.get_by_slug(slug, project_id) is not None


class SqlArtifactRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, artifact: e.Artifact) -> e.Artifact:
        orm = m.Artifact(
            id=artifact.id,
            project_id=artifact.project_id,
            domain_id=artifact.domain_id,
            artifact_type_id=artifact.artifact_type_id,
            title=artifact.title,
            slug=artifact.slug,
            status=artifact.status,
            current_version_id=artifact.current_version_id,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_to_domain(orm)

    def get_by_id(self, artifact_id: uuid.UUID) -> e.Artifact | None:
        orm = self.db.get(m.Artifact, artifact_id)
        return mappers.artifact_to_domain(orm) if orm else None

    def get_by_slug(self, project_id: uuid.UUID, slug: str) -> e.Artifact | None:
        orm = self.db.scalar(
            select(m.Artifact).where(
                m.Artifact.project_id == project_id, m.Artifact.slug == slug
            )
        )
        return mappers.artifact_to_domain(orm) if orm else None

    def update(self, artifact: e.Artifact) -> e.Artifact:
        orm = self.db.get(m.Artifact, artifact.id)
        if orm is None:
            raise NotFoundError("artifact not found")
        orm.title = artifact.title
        orm.slug = artifact.slug
        orm.status = artifact.status
        orm.domain_id = artifact.domain_id
        orm.current_version_id = artifact.current_version_id
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_to_domain(orm)

    def delete(self, artifact_id: uuid.UUID) -> None:
        orm = self.db.get(m.Artifact, artifact_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def set_current_version(self, artifact_id: uuid.UUID, version_id: uuid.UUID) -> None:
        orm = self.db.get(m.Artifact, artifact_id)
        if orm is None:
            raise NotFoundError("artifact not found")
        orm.current_version_id = version_id
        self.db.flush()

    def list(
        self, project_id: uuid.UUID, *, artifact_type_id: uuid.UUID | None = None
    ) -> list[e.Artifact]:
        stmt = select(m.Artifact).where(m.Artifact.project_id == project_id)
        if artifact_type_id is not None:
            stmt = stmt.where(m.Artifact.artifact_type_id == artifact_type_id)
        stmt = stmt.order_by(m.Artifact.created_at.desc())
        return [mappers.artifact_to_domain(o) for o in self.db.scalars(stmt).all()]

    def add_version(self, version: e.ArtifactVersion) -> e.ArtifactVersion:
        orm = m.ArtifactVersion(
            id=version.id,
            artifact_id=version.artifact_id,
            version_number=version.version_number,
            source_note_ids=version.source_note_ids,
            source_task_ids=version.source_task_ids,
            source_document_ids=version.source_document_ids,
            change_note=version.change_note,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_version_to_domain(orm)

    def next_version_number(self, artifact_id: uuid.UUID) -> int:
        current_max = self.db.scalar(
            select(func.coalesce(func.max(m.ArtifactVersion.version_number), 0)).where(
                m.ArtifactVersion.artifact_id == artifact_id
            )
        )
        return int(current_max) + 1

    def list_versions(self, artifact_id: uuid.UUID) -> list[e.ArtifactVersion]:
        stmt = (
            select(m.ArtifactVersion)
            .where(m.ArtifactVersion.artifact_id == artifact_id)
            .order_by(m.ArtifactVersion.version_number)
        )
        return [mappers.artifact_version_to_domain(o) for o in self.db.scalars(stmt).all()]

    def get_version(
        self, artifact_id: uuid.UUID, version_number: int
    ) -> e.ArtifactVersion | None:
        orm = self.db.scalar(
            select(m.ArtifactVersion).where(
                m.ArtifactVersion.artifact_id == artifact_id,
                m.ArtifactVersion.version_number == version_number,
            )
        )
        return mappers.artifact_version_to_domain(orm) if orm else None

    def get_version_by_id(self, version_id: uuid.UUID) -> e.ArtifactVersion | None:
        orm = self.db.get(m.ArtifactVersion, version_id)
        return mappers.artifact_version_to_domain(orm) if orm else None

    def add_files(self, files: list[e.ArtifactFile]) -> list[e.ArtifactFile]:
        orms = [
            m.ArtifactFile(
                id=f.id,
                artifact_version_id=f.artifact_version_id,
                path=f.path,
                content=f.content,
                note=f.note,
                order_index=f.order_index,
            )
            for f in files
        ]
        self.db.add_all(orms)
        self.db.flush()
        return [mappers.artifact_file_to_domain(o) for o in orms]

    def list_files(self, version_id: uuid.UUID) -> list[e.ArtifactFile]:
        stmt = (
            select(m.ArtifactFile)
            .where(m.ArtifactFile.artifact_version_id == version_id)
            .order_by(m.ArtifactFile.order_index, m.ArtifactFile.path)
        )
        return [mappers.artifact_file_to_domain(o) for o in self.db.scalars(stmt).all()]

    def add_phases(self, phases: list[e.ArtifactPhase]) -> list[e.ArtifactPhase]:
        orms = [
            m.ArtifactPhase(
                id=p.id,
                artifact_version_id=p.artifact_version_id,
                order_index=p.order_index,
                title=p.title,
                status=p.status,
                note=p.note,
            )
            for p in phases
        ]
        self.db.add_all(orms)
        self.db.flush()
        return [mappers.artifact_phase_to_domain(o) for o in orms]

    def list_phases(self, version_id: uuid.UUID) -> list[e.ArtifactPhase]:
        stmt = (
            select(m.ArtifactPhase)
            .where(m.ArtifactPhase.artifact_version_id == version_id)
            .order_by(m.ArtifactPhase.order_index)
        )
        return [mappers.artifact_phase_to_domain(o) for o in self.db.scalars(stmt).all()]

    def get_phase(self, phase_id: uuid.UUID) -> e.ArtifactPhase | None:
        orm = self.db.get(m.ArtifactPhase, phase_id)
        return mappers.artifact_phase_to_domain(orm) if orm else None

    def update_phase(self, phase: e.ArtifactPhase) -> e.ArtifactPhase:
        orm = self.db.get(m.ArtifactPhase, phase.id)
        if orm is None:
            raise NotFoundError("phase not found")
        orm.status = phase.status
        orm.note = phase.note
        self.db.flush()
        self.db.refresh(orm)
        return mappers.artifact_phase_to_domain(orm)

    def list_by_source_note(self, note_id: uuid.UUID) -> list[e.Artifact]:
        sub = select(m.ArtifactVersion.artifact_id).where(
            m.ArtifactVersion.source_note_ids.any(note_id)
        )
        stmt = select(m.Artifact).where(m.Artifact.id.in_(sub))
        return [mappers.artifact_to_domain(o) for o in self.db.scalars(stmt).all()]

    def list_by_source_task(self, task_id: uuid.UUID) -> list[e.Artifact]:
        sub = select(m.ArtifactVersion.artifact_id).where(
            m.ArtifactVersion.source_task_ids.any(task_id)
        )
        stmt = select(m.Artifact).where(m.Artifact.id.in_(sub))
        return [mappers.artifact_to_domain(o) for o in self.db.scalars(stmt).all()]

    def iter_indexable_files(self) -> list[IndexableFile]:
        # Files belonging to each artifact's current version, with parent context.
        stmt = (
            select(
                m.ArtifactFile.id,
                m.Artifact.project_id,
                m.Artifact.domain_id,
                m.Artifact.title,
                m.ArtifactFile.path,
                m.ArtifactFile.content,
            )
            .join(
                m.ArtifactVersion,
                m.ArtifactVersion.id == m.ArtifactFile.artifact_version_id,
            )
            .join(m.Artifact, m.Artifact.current_version_id == m.ArtifactVersion.id)
        )
        return [
            IndexableFile(
                id=row.id,
                project_id=row.project_id,
                domain_id=row.domain_id,
                title=row.title,
                path=row.path,
                content=row.content,
            )
            for row in self.db.execute(stmt).all()
        ]


class SqlSkillRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, skill: e.Skill) -> e.Skill:
        orm = m.Skill(
            id=skill.id,
            scope=skill.scope,
            project_id=skill.project_id,
            name=skill.name,
            slug=skill.slug,
            description=skill.description,
            content=skill.content,
            tags=skill.tags,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.skill_to_domain(orm)

    def get_by_id(self, skill_id: uuid.UUID) -> e.Skill | None:
        orm = self.db.get(m.Skill, skill_id)
        return mappers.skill_to_domain(orm) if orm else None

    def get_by_slug(self, slug: str, project_id: uuid.UUID | None) -> e.Skill | None:
        stmt = select(m.Skill).where(m.Skill.slug == slug)
        stmt = stmt.where(
            m.Skill.project_id == project_id
            if project_id is not None
            else m.Skill.project_id.is_(None)
        )
        orm = self.db.scalar(stmt)
        return mappers.skill_to_domain(orm) if orm else None

    def update(self, skill: e.Skill) -> e.Skill:
        orm = self.db.get(m.Skill, skill.id)
        if orm is None:
            raise NotFoundError("skill not found")
        orm.name = skill.name
        orm.slug = skill.slug
        orm.description = skill.description
        orm.content = skill.content
        orm.tags = skill.tags
        self.db.flush()
        self.db.refresh(orm)
        return mappers.skill_to_domain(orm)

    def delete(self, skill_id: uuid.UUID) -> None:
        orm = self.db.get(m.Skill, skill_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, slug: str, project_id: uuid.UUID | None) -> bool:
        return self.get_by_slug(slug, project_id) is not None

    def list(
        self, *, scope: ScopeKind | None = None, tag: str | None = None
    ) -> list[e.Skill]:
        stmt = select(m.Skill)
        if scope is not None:
            stmt = stmt.where(m.Skill.scope == scope)
        if tag is not None:
            stmt = stmt.where(m.Skill.tags.any(tag))
        stmt = stmt.order_by(m.Skill.name)
        return [mappers.skill_to_domain(o) for o in self.db.scalars(stmt).all()]

    def list_applicable(self, project_id: uuid.UUID) -> list[e.Skill]:
        attached = select(m.ProjectSkill.skill_id).where(m.ProjectSkill.project_id == project_id)
        stmt = (
            select(m.Skill)
            .where(or_(m.Skill.project_id == project_id, m.Skill.id.in_(attached)))
            .order_by(m.Skill.name)
        )
        return [mappers.skill_to_domain(o) for o in self.db.scalars(stmt).all()]

    def attach(self, project_id: uuid.UUID, skill_id: uuid.UUID) -> None:
        if self.db.get(m.ProjectSkill, (project_id, skill_id)) is None:
            self.db.add(m.ProjectSkill(project_id=project_id, skill_id=skill_id))
            self.db.flush()

    def detach(self, project_id: uuid.UUID, skill_id: uuid.UUID) -> None:
        existing = self.db.get(m.ProjectSkill, (project_id, skill_id))
        if existing is not None:
            self.db.delete(existing)
            self.db.flush()

    def is_attached(self, project_id: uuid.UUID, skill_id: uuid.UUID) -> bool:
        return self.db.get(m.ProjectSkill, (project_id, skill_id)) is not None


class SqlDocumentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, document: e.Document) -> e.Document:
        orm = m.Document(
            id=document.id,
            project_id=document.project_id,
            domain_id=document.domain_id,
            title=document.title,
            filename=document.filename,
            mime_type=document.mime_type,
            storage_path=document.storage_path,
            extracted_text=document.extracted_text,
            tags=document.tags,
            indexed_at=document.indexed_at,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.document_to_domain(orm)

    def get_by_id(self, document_id: uuid.UUID) -> e.Document | None:
        orm = self.db.get(m.Document, document_id)
        return mappers.document_to_domain(orm) if orm else None

    def list_all(self) -> list[e.Document]:
        return [mappers.document_to_domain(o) for o in self.db.scalars(select(m.Document)).all()]

    def set_indexed(self, document_id: uuid.UUID, indexed_at: datetime) -> None:
        orm = self.db.get(m.Document, document_id)
        if orm is not None:
            orm.indexed_at = indexed_at
            self.db.flush()

    def delete(self, document_id: uuid.UUID) -> None:
        orm = self.db.get(m.Document, document_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def list(
        self,
        project_id: uuid.UUID,
        *,
        domain_id: uuid.UUID | None = None,
        tag: str | None = None,
    ) -> list[e.Document]:
        stmt = select(m.Document).where(m.Document.project_id == project_id)
        if domain_id is not None:
            stmt = stmt.where(m.Document.domain_id == domain_id)
        if tag is not None:
            stmt = stmt.where(m.Document.tags.any(tag))
        stmt = stmt.order_by(m.Document.created_at.desc())
        return [mappers.document_to_domain(o) for o in self.db.scalars(stmt).all()]


class SqlProjectTemplateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, template: e.ProjectTemplate) -> e.ProjectTemplate:
        orm = m.ProjectTemplate(
            id=template.id,
            name=template.name,
            slug=template.slug,
            description=template.description,
            definition=template.definition,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.project_template_to_domain(orm)

    def get_by_id(self, template_id: uuid.UUID) -> e.ProjectTemplate | None:
        orm = self.db.get(m.ProjectTemplate, template_id)
        return mappers.project_template_to_domain(orm) if orm else None

    def get_by_slug(self, slug: str) -> e.ProjectTemplate | None:
        orm = self.db.scalar(select(m.ProjectTemplate).where(m.ProjectTemplate.slug == slug))
        return mappers.project_template_to_domain(orm) if orm else None

    def list(self) -> list[e.ProjectTemplate]:
        stmt = select(m.ProjectTemplate).order_by(m.ProjectTemplate.name)
        return [mappers.project_template_to_domain(o) for o in self.db.scalars(stmt).all()]

    def update(self, template: e.ProjectTemplate) -> e.ProjectTemplate:
        orm = self.db.get(m.ProjectTemplate, template.id)
        if orm is None:
            raise NotFoundError("template not found")
        orm.name = template.name
        orm.slug = template.slug
        orm.description = template.description
        orm.definition = template.definition
        self.db.flush()
        self.db.refresh(orm)
        return mappers.project_template_to_domain(orm)

    def delete(self, template_id: uuid.UUID) -> None:
        orm = self.db.get(m.ProjectTemplate, template_id)
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()

    def slug_exists(self, slug: str) -> bool:
        return (
            self.db.scalar(select(m.ProjectTemplate.id).where(m.ProjectTemplate.slug == slug))
            is not None
        )


class SqlUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, user: e.User) -> e.User:
        orm = m.User(
            id=user.id,
            email=user.email,
            password_hash=user.password_hash,
            is_active=user.is_active,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.user_to_domain(orm)

    def get_by_id(self, user_id: uuid.UUID) -> e.User | None:
        orm = self.db.get(m.User, user_id)
        return mappers.user_to_domain(orm) if orm else None

    def get_by_email(self, email: str) -> e.User | None:
        orm = self.db.scalar(select(m.User).where(m.User.email == email))
        return mappers.user_to_domain(orm) if orm else None


class SqlSessionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, session: e.Session) -> e.Session:
        orm = m.Session(
            id=session.id,
            user_id=session.user_id,
            token_hash=session.token_hash,
            expires_at=session.expires_at,
        )
        self.db.add(orm)
        self.db.flush()
        self.db.refresh(orm)
        return mappers.session_to_domain(orm)

    def get_by_token_hash(self, token_hash: str) -> e.Session | None:
        orm = self.db.scalar(select(m.Session).where(m.Session.token_hash == token_hash))
        return mappers.session_to_domain(orm) if orm else None

    def delete_by_token_hash(self, token_hash: str) -> None:
        orm = self.db.scalar(select(m.Session).where(m.Session.token_hash == token_hash))
        if orm is not None:
            self.db.delete(orm)
            self.db.flush()
