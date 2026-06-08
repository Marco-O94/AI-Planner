"""ProjectTemplate DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TemplateCreate(BaseModel):
    name: str
    definition: dict = {}
    description: str | None = None


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    definition: dict | None = None


class SaveAsTemplateRequest(BaseModel):
    name: str
    description: str | None = None


class ApplyTemplateRequest(BaseModel):
    template_slug: str


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    definition: dict
    created_at: datetime | None
    updated_at: datetime | None
