"""Project DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.domain.enums import ProjectStatus, TechnologyKind
from app.domain.read_models import ProjectDetail, ProjectTechnologyRef


class TechnologyInput(BaseModel):
    kind: TechnologyKind
    name: str
    version: str | None = None


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    repository_url: str | None = None
    metadata: dict | None = None
    technologies: list[TechnologyInput] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    repository_url: str | None = None
    metadata: dict | None = None


class AttachTechnologyRequest(BaseModel):
    kind: TechnologyKind
    name: str
    version: str | None = None


class ProjectTechnologyRead(BaseModel):
    id: uuid.UUID
    kind: str
    name: str
    slug: str
    version: str | None = None

    @classmethod
    def from_ref(cls, ref: ProjectTechnologyRef) -> "ProjectTechnologyRead":
        return cls(id=ref.id, kind=str(ref.kind), name=ref.name, slug=ref.slug, version=ref.version)


class ProjectRead(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    status: ProjectStatus
    repository_url: str | None
    metadata: dict | None
    created_at: datetime | None
    updated_at: datetime | None
    technologies: list[ProjectTechnologyRead]
    note_count: int
    task_count: int
    artifact_count: int

    @classmethod
    def from_detail(cls, detail: ProjectDetail) -> "ProjectRead":
        p = detail.project
        return cls(
            id=p.id,
            name=p.name,
            slug=p.slug,
            description=p.description,
            status=p.status,
            repository_url=p.repository_url,
            metadata=p.metadata,
            created_at=p.created_at,
            updated_at=p.updated_at,
            technologies=[ProjectTechnologyRead.from_ref(t) for t in detail.technologies],
            note_count=detail.note_count,
            task_count=detail.task_count,
            artifact_count=detail.artifact_count,
        )
