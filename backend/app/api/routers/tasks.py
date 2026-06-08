"""Task endpoints + task->artifact reverse lookup."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_artifact_service, get_task_service
from app.application.artifact_service import ArtifactService
from app.application.task_service import TaskService
from app.domain.enums import TaskPriority, TaskStatus
from app.schemas.artifact import ArtifactRead
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/projects/{slug}/tasks", response_model=list[TaskRead])
def list_tasks(
    slug: str,
    domain_id: uuid.UUID | None = None,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    tag: str | None = None,
    service: TaskService = Depends(get_task_service),
) -> list[TaskRead]:
    items = service.list(slug, domain_id=domain_id, status=status, priority=priority, tag=tag)
    return [TaskRead.from_status(i) for i in items]


@router.post("/projects/{slug}/tasks", response_model=TaskRead, status_code=201)
def create_task(
    slug: str,
    payload: TaskCreate,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    item = service.create(
        slug,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        depends_on=payload.depends_on,
        tags=payload.tags,
        domain_id=payload.domain_id,
    )
    return TaskRead.from_status(item)


@router.get("/tasks/{task_id}", response_model=TaskRead)
def get_task(task_id: uuid.UUID, service: TaskService = Depends(get_task_service)) -> TaskRead:
    return TaskRead.from_status(service.get(task_id))


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    service: TaskService = Depends(get_task_service),
) -> TaskRead:
    return TaskRead.from_status(
        service.update(task_id, payload.model_dump(exclude_unset=True))
    )


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: uuid.UUID, service: TaskService = Depends(get_task_service)) -> None:
    service.delete(task_id)


@router.get("/tasks/{task_id}/artifacts", response_model=list[ArtifactRead])
def artifacts_from_task(
    task_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> list[ArtifactRead]:
    return [ArtifactRead.model_validate(a) for a in service.artifacts_for_task(task_id)]
