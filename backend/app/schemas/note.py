"""Note DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import NoteType


class NoteCreate(BaseModel):
    type: NoteType
    content: str
    title: str | None = None
    tags: list[str] = []
    domain_id: uuid.UUID | None = None


class NoteUpdate(BaseModel):
    type: NoteType | None = None
    content: str | None = None
    title: str | None = None
    tags: list[str] | None = None
    domain_id: uuid.UUID | None = None


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    type: NoteType
    title: str | None
    content: str
    tags: list[str]
    created_at: datetime | None
    updated_at: datetime | None
