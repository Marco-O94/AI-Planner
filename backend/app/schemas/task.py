"""Task DTOs."""

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.domain.enums import TaskPriority, TaskStatus
from app.domain.read_models import TaskWithStatus


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    depends_on: list[uuid.UUID] = []
    tags: list[str] = []
    domain_id: uuid.UUID | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    depends_on: list[uuid.UUID] | None = None
    tags: list[str] | None = None
    domain_id: uuid.UUID | None = None


class TaskRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    depends_on: list[uuid.UUID]
    tags: list[str]
    blocked: bool
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_status(cls, item: TaskWithStatus) -> "TaskRead":
        t = item.task
        return cls(
            id=t.id,
            project_id=t.project_id,
            domain_id=t.domain_id,
            title=t.title,
            description=t.description,
            status=t.status,
            priority=t.priority,
            depends_on=t.depends_on,
            tags=t.tags,
            blocked=item.blocked,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
