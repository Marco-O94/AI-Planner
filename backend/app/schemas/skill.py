"""Skill DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.domain.enums import ScopeKind


class SkillCreate(BaseModel):
    scope: ScopeKind
    name: str
    description: str
    content: str
    tags: list[str] = []
    project_slug: str | None = None


class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    content: str | None = None
    tags: list[str] | None = None


class SkillRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope: ScopeKind
    project_id: uuid.UUID | None
    name: str
    slug: str
    description: str
    content: str
    tags: list[str]
    created_at: datetime | None
    updated_at: datetime | None
