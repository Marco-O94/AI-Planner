"""Domain (bounded context) DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DomainCreate(BaseModel):
    name: str
    description: str | None = None
    ubiquitous_language: dict | None = None


class DomainUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    ubiquitous_language: dict | None = None


class DomainRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    slug: str
    description: str | None
    ubiquitous_language: dict | None
    created_at: datetime | None
    updated_at: datetime | None
