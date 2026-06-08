"""Pure domain entities (frozen dataclasses, no I/O, no SQLAlchemy).

These are the canonical in-memory representation an application service works
with. Repositories map between these and ORM rows. Immutability is enforced
with ``frozen=True``; "updates" produce new copies via ``dataclasses.replace``.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime

from app.domain.enums import (
    ArtifactStatus,
    NoteType,
    PhaseStatus,
    ProjectStatus,
    ScopeKind,
    TaskPriority,
    TaskStatus,
    TechnologyKind,
)


@dataclass(frozen=True, slots=True)
class Technology:
    id: uuid.UUID
    kind: TechnologyKind
    name: str
    slug: str


@dataclass(frozen=True, slots=True)
class Project:
    id: uuid.UUID
    name: str
    slug: str
    status: ProjectStatus
    description: str | None = None
    repository_url: str | None = None
    metadata: dict | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Domain:
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    ubiquitous_language: dict | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Note:
    id: uuid.UUID
    project_id: uuid.UUID
    type: NoteType
    content: str
    domain_id: uuid.UUID | None = None
    title: str | None = None
    tags: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Task:
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    status: TaskStatus
    priority: TaskPriority
    domain_id: uuid.UUID | None = None
    description: str | None = None
    depends_on: list[uuid.UUID] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class ArtifactType:
    id: uuid.UUID
    scope: ScopeKind
    name: str
    slug: str
    instructions: str
    project_id: uuid.UUID | None = None
    description: str | None = None
    output_files: list[dict] = field(default_factory=list)
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class ArtifactFile:
    id: uuid.UUID
    artifact_version_id: uuid.UUID
    path: str
    content: str
    order_index: int = 0
    note: str | None = None


@dataclass(frozen=True, slots=True)
class ArtifactPhase:
    id: uuid.UUID
    artifact_version_id: uuid.UUID
    order_index: int
    title: str
    status: PhaseStatus
    note: str | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class ArtifactVersion:
    id: uuid.UUID
    artifact_id: uuid.UUID
    version_number: int
    source_note_ids: list[uuid.UUID] = field(default_factory=list)
    source_task_ids: list[uuid.UUID] = field(default_factory=list)
    source_document_ids: list[uuid.UUID] = field(default_factory=list)
    change_note: str | None = None
    created_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Artifact:
    id: uuid.UUID
    project_id: uuid.UUID
    artifact_type_id: uuid.UUID
    title: str
    slug: str
    status: ArtifactStatus
    domain_id: uuid.UUID | None = None
    current_version_id: uuid.UUID | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Skill:
    id: uuid.UUID
    scope: ScopeKind
    name: str
    slug: str
    description: str
    content: str
    project_id: uuid.UUID | None = None
    tags: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Document:
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    filename: str
    mime_type: str
    storage_path: str
    domain_id: uuid.UUID | None = None
    extracted_text: str | None = None
    tags: list[str] = field(default_factory=list)
    indexed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class ProjectTemplate:
    id: uuid.UUID
    name: str
    slug: str
    definition: dict
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
