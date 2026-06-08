"""ArtifactType DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ScopeKind


class OutputFile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    path: str
    note: str | None = None


class ArtifactTypeCreate(BaseModel):
    scope: ScopeKind
    name: str
    instructions: str
    description: str | None = None
    output_files: list[OutputFile] = []
    project_slug: str | None = None


class ArtifactTypeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    instructions: str | None = None
    output_files: list[OutputFile] | None = None


class ArtifactTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope: ScopeKind
    project_id: uuid.UUID | None
    name: str
    slug: str
    description: str | None
    instructions: str
    output_files: list[OutputFile]
    is_default: bool
    created_at: datetime | None
    updated_at: datetime | None
