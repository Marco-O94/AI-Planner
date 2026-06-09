"""NoteType endpoints (mirror artifact_types; delete-in-use -> 409 via FK)."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_note_type_service
from app.application.note_type_service import NoteTypeService
from app.domain.enums import ScopeKind
from app.schemas.note_type import NoteTypeCreate, NoteTypeRead, NoteTypeUpdate

router = APIRouter(tags=["note-types"])


@router.get("/note-types", response_model=list[NoteTypeRead])
def list_note_types(
    scope: ScopeKind | None = None,
    service: NoteTypeService = Depends(get_note_type_service),
) -> list[NoteTypeRead]:
    return [NoteTypeRead.model_validate(t) for t in service.list(scope=scope)]


@router.post("/note-types", response_model=NoteTypeRead, status_code=201)
def create_note_type(
    payload: NoteTypeCreate,
    service: NoteTypeService = Depends(get_note_type_service),
) -> NoteTypeRead:
    note_type = service.create(
        scope=payload.scope,
        name=payload.name,
        color=payload.color,
        description=payload.description,
        project_slug=payload.project_slug,
    )
    return NoteTypeRead.model_validate(note_type)


@router.get("/note-types/{type_id}", response_model=NoteTypeRead)
def get_note_type(
    type_id: uuid.UUID, service: NoteTypeService = Depends(get_note_type_service)
) -> NoteTypeRead:
    return NoteTypeRead.model_validate(service.get(type_id))


@router.patch("/note-types/{type_id}", response_model=NoteTypeRead)
def update_note_type(
    type_id: uuid.UUID,
    payload: NoteTypeUpdate,
    service: NoteTypeService = Depends(get_note_type_service),
) -> NoteTypeRead:
    changes = payload.model_dump(exclude_unset=True)
    return NoteTypeRead.model_validate(service.update(type_id, changes))


@router.delete("/note-types/{type_id}", status_code=204)
def delete_note_type(
    type_id: uuid.UUID, service: NoteTypeService = Depends(get_note_type_service)
) -> None:
    service.delete(type_id)


@router.get("/projects/{slug}/note-types", response_model=list[NoteTypeRead])
def list_applicable_note_types(
    slug: str, service: NoteTypeService = Depends(get_note_type_service)
) -> list[NoteTypeRead]:
    return [NoteTypeRead.model_validate(t) for t in service.list_applicable(slug)]
