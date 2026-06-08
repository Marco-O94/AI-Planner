"""Document service: store an upload, extract text, persist, and dual-index."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Protocol

from app.domain.entities import Document
from app.domain.errors import NotFoundError, ValidationError
from app.domain.repositories import DocumentRepository, DomainRepository, ProjectRepository


class _Storage(Protocol):
    def save(self, filename: str, data: bytes) -> str: ...
    def read(self, storage_path: str) -> bytes: ...
    def delete(self, storage_path: str) -> None: ...


class DocumentService:
    def __init__(
        self,
        repo: DocumentRepository,
        project_repo: ProjectRepository,
        domain_repo: DomainRepository,
        storage: _Storage,
        extractor: Callable[[str, str, bytes], str],
        indexer=None,
    ) -> None:
        self.repo = repo
        self.project_repo = project_repo
        self.domain_repo = domain_repo
        self.storage = storage
        self.extractor = extractor
        self.indexer = indexer

    def _require_project(self, project_slug: str):
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project

    def _validate_domain(self, project_id: uuid.UUID, domain_id: uuid.UUID | None) -> None:
        if domain_id is None:
            return
        domain = self.domain_repo.get_by_id(domain_id)
        if domain is None or domain.project_id != project_id:
            raise ValidationError("domain does not belong to this project")

    def create(
        self,
        project_slug: str,
        *,
        title: str,
        filename: str,
        content: bytes,
        mime_type: str,
        domain_id: uuid.UUID | None = None,
        tags: list[str] | None = None,
    ) -> Document:
        project = self._require_project(project_slug)
        self._validate_domain(project.id, domain_id)
        storage_path = self.storage.save(filename, content)
        extracted = self.extractor(filename, mime_type, content)
        document = self.repo.add(
            Document(
                id=uuid.uuid4(),
                project_id=project.id,
                domain_id=domain_id,
                title=title,
                filename=filename,
                mime_type=mime_type,
                storage_path=storage_path,
                extracted_text=extracted,
                tags=tags or [],
            )
        )
        if self.indexer is not None:
            self.indexer.index_document(document)
            self.repo.set_indexed(document.id, datetime.now(UTC))
            document = self.repo.get_by_id(document.id)
        return document

    def get(self, document_id: uuid.UUID) -> Document:
        document = self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("document not found")
        return document

    def list(
        self,
        project_slug: str,
        *,
        domain_id: uuid.UUID | None = None,
        tag: str | None = None,
    ) -> list[Document]:
        project = self._require_project(project_slug)
        return self.repo.list(project.id, domain_id=domain_id, tag=tag)

    def read_original(self, document_id: uuid.UUID) -> tuple[Document, bytes]:
        document = self.get(document_id)
        return document, self.storage.read(document.storage_path)

    def delete(self, document_id: uuid.UUID) -> None:
        document = self.get(document_id)
        self.storage.delete(document.storage_path)
        self.repo.delete(document.id)
        if self.indexer is not None:
            from app.domain.vector import KIND_DOCUMENT

            self.indexer.remove(KIND_DOCUMENT, document.id)
