"""ArtifactType endpoints (the default type cannot be deleted)."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_artifact_type_service
from app.application.artifact_type_service import ArtifactTypeService
from app.domain.enums import ScopeKind
from app.schemas.artifact_type import (
    ArtifactTypeCreate,
    ArtifactTypeRead,
    ArtifactTypeUpdate,
)

router = APIRouter(tags=["artifact-types"])


@router.get("/artifact-types", response_model=list[ArtifactTypeRead])
def list_artifact_types(
    scope: ScopeKind | None = None,
    service: ArtifactTypeService = Depends(get_artifact_type_service),
) -> list[ArtifactTypeRead]:
    return [ArtifactTypeRead.model_validate(t) for t in service.list(scope=scope)]


@router.post("/artifact-types", response_model=ArtifactTypeRead, status_code=201)
def create_artifact_type(
    payload: ArtifactTypeCreate,
    service: ArtifactTypeService = Depends(get_artifact_type_service),
) -> ArtifactTypeRead:
    artifact_type = service.create(
        scope=payload.scope,
        name=payload.name,
        instructions=payload.instructions,
        description=payload.description,
        output_files=[f.model_dump() for f in payload.output_files],
        project_slug=payload.project_slug,
    )
    return ArtifactTypeRead.model_validate(artifact_type)


@router.get("/artifact-types/{type_id}", response_model=ArtifactTypeRead)
def get_artifact_type(
    type_id: uuid.UUID, service: ArtifactTypeService = Depends(get_artifact_type_service)
) -> ArtifactTypeRead:
    return ArtifactTypeRead.model_validate(service.get(type_id))


@router.patch("/artifact-types/{type_id}", response_model=ArtifactTypeRead)
def update_artifact_type(
    type_id: uuid.UUID,
    payload: ArtifactTypeUpdate,
    service: ArtifactTypeService = Depends(get_artifact_type_service),
) -> ArtifactTypeRead:
    changes = payload.model_dump(exclude_unset=True)
    if "output_files" in changes and changes["output_files"] is not None:
        changes["output_files"] = [dict(f) for f in changes["output_files"]]
    return ArtifactTypeRead.model_validate(service.update(type_id, changes))


@router.delete("/artifact-types/{type_id}", status_code=204)
def delete_artifact_type(
    type_id: uuid.UUID, service: ArtifactTypeService = Depends(get_artifact_type_service)
) -> None:
    service.delete(type_id)


@router.get("/projects/{slug}/artifact-types", response_model=list[ArtifactTypeRead])
def list_applicable_types(
    slug: str, service: ArtifactTypeService = Depends(get_artifact_type_service)
) -> list[ArtifactTypeRead]:
    return [ArtifactTypeRead.model_validate(t) for t in service.list_applicable(slug)]
