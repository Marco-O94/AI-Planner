"""NoteType DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ScopeKind


class NoteTypeCreate(BaseModel):
    scope: ScopeKind
    name: str
    color: str
    description: str | None = None
    project_slug: str | None = None


class NoteTypeUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None


class NoteTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope: ScopeKind
    project_id: uuid.UUID | None
    key: str | None
    name: str
    slug: str
    color: str
    description: str | None
    is_default: bool
    created_at: datetime | None
    updated_at: datetime | None
