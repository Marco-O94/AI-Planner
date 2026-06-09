"""Technology DTOs."""

import uuid

from pydantic import BaseModel, ConfigDict

from app.domain.enums import TechnologyKind


class TechnologyCreate(BaseModel):
    kind: TechnologyKind
    name: str


class TechnologyUpdate(BaseModel):
    kind: TechnologyKind | None = None
    name: str | None = None


class TechnologyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: TechnologyKind
    name: str
    slug: str
