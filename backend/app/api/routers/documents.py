"""Document upload / listing / download / delete."""

import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response

from app.api.deps import get_document_service
from app.application.document_service import DocumentService
from app.schemas.document import DocumentRead

router = APIRouter(tags=["documents"])


def _parse_tags(raw: str | None) -> list[str]:
    return [t.strip() for t in raw.split(",")] if raw else []


@router.post("/projects/{slug}/documents", response_model=DocumentRead, status_code=201)
def upload_document(
    slug: str,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    domain_id: uuid.UUID | None = Form(default=None),
    tags: str | None = Form(default=None),
    service: DocumentService = Depends(get_document_service),
) -> DocumentRead:
    content = file.file.read()
    document = service.create(
        slug,
        title=title or file.filename or "document",
        filename=file.filename or "document",
        content=content,
        mime_type=file.content_type or "application/octet-stream",
        domain_id=domain_id,
        tags=_parse_tags(tags),
    )
    return DocumentRead.model_validate(document)


@router.get("/projects/{slug}/documents", response_model=list[DocumentRead])
def list_documents(
    slug: str,
    domain_id: uuid.UUID | None = None,
    tag: str | None = None,
    service: DocumentService = Depends(get_document_service),
) -> list[DocumentRead]:
    docs = service.list(slug, domain_id=domain_id, tag=tag)
    return [DocumentRead.model_validate(d) for d in docs]


@router.get("/documents/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: uuid.UUID, service: DocumentService = Depends(get_document_service)
) -> DocumentRead:
    return DocumentRead.model_validate(service.get(document_id))


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: uuid.UUID, service: DocumentService = Depends(get_document_service)
) -> Response:
    document, data = service.read_original(document_id)
    return Response(
        content=data,
        media_type=document.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID, service: DocumentService = Depends(get_document_service)
) -> None:
    service.delete(document_id)
