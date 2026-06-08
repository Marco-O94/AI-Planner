"""Composite read models — aggregates assembled for presentation.

These carry computed/joined data (counts, grouped technologies, blocked flag,
manifest coverage) that does not belong on a single persisted entity.
"""

import uuid
from dataclasses import dataclass, field

from app.domain.entities import (
    Artifact,
    ArtifactFile,
    ArtifactPhase,
    ArtifactType,
    ArtifactVersion,
    Project,
    Task,
)


@dataclass(frozen=True, slots=True)
class ProjectTechnologyRef:
    """A technology attached to a project, with its optional version."""

    id: uuid.UUID
    kind: str
    name: str
    slug: str
    version: str | None = None


@dataclass(frozen=True, slots=True)
class ProjectDetail:
    project: Project
    technologies: list[ProjectTechnologyRef] = field(default_factory=list)
    note_count: int = 0
    task_count: int = 0
    artifact_count: int = 0


@dataclass(frozen=True, slots=True)
class TaskWithStatus:
    task: Task
    blocked: bool


@dataclass(frozen=True, slots=True)
class VersionRef:
    version_number: int
    id: uuid.UUID
    created_at: object | None = None
    change_note: str | None = None


@dataclass(frozen=True, slots=True)
class ManifestCoverage:
    present: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    extra: list[str] = field(default_factory=list)

    @property
    def is_complete(self) -> bool:
        return not self.missing and not self.extra


@dataclass(frozen=True, slots=True)
class ArtifactDetail:
    artifact: Artifact
    artifact_type: ArtifactType
    current_version: ArtifactVersion | None
    files: list[ArtifactFile] = field(default_factory=list)
    phases: list[ArtifactPhase] = field(default_factory=list)
    versions: list[VersionRef] = field(default_factory=list)
    coverage: ManifestCoverage = field(default_factory=ManifestCoverage)
