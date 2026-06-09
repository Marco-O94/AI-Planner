"""Note endpoints + note->artifact reverse lookup."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_artifact_service, get_note_service
from app.application.artifact_service import ArtifactService
from app.application.note_service import NoteService
from app.schemas.artifact import ArtifactRead
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(tags=["notes"])


@router.get("/projects/{slug}/notes", response_model=list[NoteRead])
def list_notes(
    slug: str,
    domain_id: uuid.UUID | None = None,
    type: str | None = None,
    tag: str | None = None,
    service: NoteService = Depends(get_note_service),
) -> list[NoteRead]:
    notes = service.list(slug, domain_id=domain_id, type=type, tag=tag)
    return [NoteRead.model_validate(n) for n in notes]


@router.post("/projects/{slug}/notes", response_model=NoteRead, status_code=201)
def create_note(
    slug: str,
    payload: NoteCreate,
    service: NoteService = Depends(get_note_service),
) -> NoteRead:
    note = service.create(
        slug,
        type=payload.type,
        content=payload.content,
        title=payload.title,
        tags=payload.tags,
        domain_id=payload.domain_id,
    )
    return NoteRead.model_validate(note)


@router.get("/notes/{note_id}", response_model=NoteRead)
def get_note(note_id: uuid.UUID, service: NoteService = Depends(get_note_service)) -> NoteRead:
    return NoteRead.model_validate(service.get(note_id))


@router.patch("/notes/{note_id}", response_model=NoteRead)
def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteRead:
    return NoteRead.model_validate(
        service.update(note_id, payload.model_dump(exclude_unset=True))
    )


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, service: NoteService = Depends(get_note_service)) -> None:
    service.delete(note_id)


@router.get("/notes/{note_id}/artifacts", response_model=list[ArtifactRead])
def artifacts_from_note(
    note_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> list[ArtifactRead]:
    return [ArtifactRead.model_validate(a) for a in service.artifacts_for_note(note_id)]
