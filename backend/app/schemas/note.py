"""Note DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field


class NoteTypeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str | None
    slug: str
    name: str
    color: str


class NoteCreate(BaseModel):
    type: str  # note-type slug or key (e.g. "requirement" / "REQUIREMENT")
    content: str
    title: str | None = None
    tags: list[str] = []
    domain_id: uuid.UUID | None = None


class NoteUpdate(BaseModel):
    type: str | None = None
    content: str | None = None
    title: str | None = None
    tags: list[str] | None = None
    domain_id: uuid.UUID | None = None


class NotesMarkProcessed(BaseModel):
    note_ids: list[uuid.UUID]
    processed: bool = True


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    note_type_id: uuid.UUID
    type: NoteTypeSummary
    title: str | None
    content: str
    tags: list[str]
    ai_processed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ai_processed(self) -> bool:
        return self.ai_processed_at is not None
