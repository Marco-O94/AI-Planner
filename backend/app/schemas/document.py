"""Document DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    title: str
    filename: str
    mime_type: str
    extracted_text: str | None
    tags: list[str]
    indexed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None
