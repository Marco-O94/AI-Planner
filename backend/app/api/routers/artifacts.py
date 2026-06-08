"""Artifact endpoints: save (create / new version), versions, diff, files,
phases, and export (single file or zip)."""

import io
import uuid
import zipfile

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse

from app.api.deps import get_artifact_service
from app.application.artifact_service import ArtifactService
from app.schemas.artifact import (
    ArtifactDetailRead,
    ArtifactFileRead,
    ArtifactRead,
    ArtifactSave,
    ArtifactUpdate,
    PhaseRead,
    PhaseUpdate,
    VersionFilesRead,
    VersionRefRead,
)

router = APIRouter(tags=["artifacts"])


@router.get("/projects/{slug}/artifacts", response_model=list[ArtifactRead])
def list_artifacts(
    slug: str,
    artifact_type: str | None = None,
    service: ArtifactService = Depends(get_artifact_service),
) -> list[ArtifactRead]:
    artifacts = service.list(slug, artifact_type_slug=artifact_type)
    return [ArtifactRead.model_validate(a) for a in artifacts]


@router.post("/projects/{slug}/artifacts", response_model=ArtifactDetailRead, status_code=201)
def save_artifact(
    slug: str,
    payload: ArtifactSave,
    service: ArtifactService = Depends(get_artifact_service),
) -> ArtifactDetailRead:
    detail = service.save(
        project_slug=slug,
        artifact_type_slug=payload.artifact_type_slug,
        title=payload.title,
        files=[f.model_dump() for f in payload.files],
        domain_id=payload.domain_id,
        source_note_ids=payload.source_note_ids,
        source_task_ids=payload.source_task_ids,
        source_document_ids=payload.source_document_ids,
        change_note=payload.change_note,
    )
    return ArtifactDetailRead.from_detail(detail)


@router.get("/artifacts/{artifact_id}", response_model=ArtifactDetailRead)
def get_artifact(
    artifact_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> ArtifactDetailRead:
    return ArtifactDetailRead.from_detail(service.get_detail(artifact_id))


@router.patch("/artifacts/{artifact_id}", response_model=ArtifactDetailRead)
def update_artifact(
    artifact_id: uuid.UUID,
    payload: ArtifactUpdate,
    service: ArtifactService = Depends(get_artifact_service),
) -> ArtifactDetailRead:
    detail = service.update(artifact_id, payload.model_dump(exclude_unset=True))
    return ArtifactDetailRead.from_detail(detail)


@router.delete("/artifacts/{artifact_id}", status_code=204)
def delete_artifact(
    artifact_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> None:
    service.delete(artifact_id)


@router.get("/artifacts/{artifact_id}/versions", response_model=list[VersionRefRead])
def list_versions(
    artifact_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> list[VersionRefRead]:
    return [
        VersionRefRead(
            version_number=v.version_number,
            id=v.id,
            created_at=v.created_at,
            change_note=v.change_note,
        )
        for v in service.list_versions(artifact_id)
    ]


@router.get("/artifacts/{artifact_id}/versions/{version_number}", response_model=VersionFilesRead)
def get_version(
    artifact_id: uuid.UUID,
    version_number: int,
    service: ArtifactService = Depends(get_artifact_service),
) -> VersionFilesRead:
    version, files = service.get_version_files(artifact_id, version_number)
    return VersionFilesRead(
        id=version.id,
        artifact_id=version.artifact_id,
        version_number=version.version_number,
        source_note_ids=version.source_note_ids,
        source_task_ids=version.source_task_ids,
        source_document_ids=version.source_document_ids,
        change_note=version.change_note,
        created_at=version.created_at,
        files=[ArtifactFileRead.model_validate(f) for f in files],
    )


@router.get("/artifacts/{artifact_id}/diff", response_class=Response)
def diff_versions(
    artifact_id: uuid.UUID,
    from_version: int = Query(..., alias="from"),
    to_version: int = Query(..., alias="to"),
    path: str = Query(...),
    service: ArtifactService = Depends(get_artifact_service),
) -> Response:
    diff = service.diff(
        artifact_id, from_version=from_version, to_version=to_version, path=path
    )
    return Response(content=diff, media_type="text/plain")


@router.get("/artifacts/{artifact_id}/files", response_model=list[ArtifactFileRead])
def list_current_files(
    artifact_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> list[ArtifactFileRead]:
    _, files = service.export_files(artifact_id)
    return [ArtifactFileRead.model_validate(f) for f in files]


@router.get("/artifacts/{artifact_id}/phases", response_model=list[PhaseRead])
def list_phases(
    artifact_id: uuid.UUID, service: ArtifactService = Depends(get_artifact_service)
) -> list[PhaseRead]:
    detail = service.get_detail(artifact_id)
    return [PhaseRead.model_validate(p) for p in detail.phases]


@router.patch("/artifacts/{artifact_id}/phases/{phase_id}", response_model=PhaseRead)
def update_phase(
    artifact_id: uuid.UUID,
    phase_id: uuid.UUID,
    payload: PhaseUpdate,
    service: ArtifactService = Depends(get_artifact_service),
) -> PhaseRead:
    phase = service.update_phase(
        artifact_id, phase_id, status=payload.status, note=payload.note
    )
    return PhaseRead.model_validate(phase)


@router.get("/artifacts/{artifact_id}/export")
def export_artifact(
    artifact_id: uuid.UUID,
    version: int | None = None,
    service: ArtifactService = Depends(get_artifact_service),
) -> Response:
    artifact, files = service.export_files(artifact_id, version_number=version)
    if len(files) == 1:
        single = files[0]
        return Response(
            content=single.content,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{single.path.split("/")[-1]}"'
            },
        )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for f in files:
            archive.writestr(f.path, f.content)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{artifact.slug}.zip"'},
    )
