"""Artifact DTOs (artifact, versions, files, phases, coverage)."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ArtifactStatus, PhaseStatus
from app.domain.entities import Artifact
from app.domain.read_models import ArtifactDetail


class ArtifactFileInput(BaseModel):
    path: str
    content: str
    note: str | None = None


class ArtifactSave(BaseModel):
    artifact_type_slug: str
    title: str
    files: list[ArtifactFileInput]
    domain_id: uuid.UUID | None = None
    source_note_ids: list[uuid.UUID] = []
    source_task_ids: list[uuid.UUID] = []
    source_document_ids: list[uuid.UUID] = []
    change_note: str | None = None


class ArtifactUpdate(BaseModel):
    title: str | None = None
    status: ArtifactStatus | None = None
    domain_id: uuid.UUID | None = None


class PhaseUpdate(BaseModel):
    status: PhaseStatus
    note: str | None = None


class ArtifactFileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    artifact_version_id: uuid.UUID
    path: str
    content: str
    note: str | None
    order_index: int


class PhaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    artifact_version_id: uuid.UUID
    order_index: int
    title: str
    status: PhaseStatus
    note: str | None
    updated_at: datetime | None


class VersionRefRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    version_number: int
    id: uuid.UUID
    created_at: datetime | None = None
    change_note: str | None = None


class ManifestCoverageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    present: list[str]
    missing: list[str]
    extra: list[str]
    is_complete: bool


class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    artifact_type_id: uuid.UUID
    title: str
    slug: str
    status: ArtifactStatus
    current_version_id: uuid.UUID | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_entity(cls, artifact: Artifact) -> "ArtifactRead":
        return cls.model_validate(artifact)


class VersionFilesRead(BaseModel):
    id: uuid.UUID
    artifact_id: uuid.UUID
    version_number: int
    source_note_ids: list[uuid.UUID]
    source_task_ids: list[uuid.UUID]
    source_document_ids: list[uuid.UUID]
    change_note: str | None
    created_at: datetime | None
    files: list[ArtifactFileRead]


class ArtifactDetailRead(BaseModel):
    artifact: ArtifactRead
    artifact_type_slug: str
    current_version_number: int | None
    files: list[ArtifactFileRead]
    phases: list[PhaseRead]
    versions: list[VersionRefRead]
    coverage: ManifestCoverageRead

    @classmethod
    def from_detail(cls, detail: ArtifactDetail) -> "ArtifactDetailRead":
        current_number = None
        if detail.current_version is not None:
            current_number = detail.current_version.version_number
        return cls(
            artifact=ArtifactRead.model_validate(detail.artifact),
            artifact_type_slug=detail.artifact_type.slug if detail.artifact_type else "",
            current_version_number=current_number,
            files=[ArtifactFileRead.model_validate(f) for f in detail.files],
            phases=[PhaseRead.model_validate(p) for p in detail.phases],
            versions=[VersionRefRead.model_validate(v) for v in detail.versions],
            coverage=ManifestCoverageRead(
                present=detail.coverage.present,
                missing=detail.coverage.missing,
                extra=detail.coverage.extra,
                is_complete=detail.coverage.is_complete,
            ),
        )
