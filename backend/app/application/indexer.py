"""Search indexer: (re)embed entities into the vector index.

Resilient by design — an embedding/Qdrant failure is logged and swallowed so a
Postgres write (the source of truth) is never lost. Drift is repaired by reindex.
"""

from __future__ import annotations

import logging
import uuid

from app.application.chunking import chunk_text
from app.domain.entities import Document, Note
from app.domain.vector import (
    KIND_ARTIFACT_FILE,
    KIND_DOCUMENT,
    KIND_NOTE,
    VectorIndex,
    VectorPoint,
)

logger = logging.getLogger(__name__)


class SearchIndexer:
    def __init__(self, embeddings, index: VectorIndex) -> None:
        self.embeddings = embeddings
        self.index = index

    def index_note(self, note: Note) -> None:
        self._safe(
            lambda: self._index(
                KIND_NOTE,
                note.id,
                note.project_id,
                note.domain_id,
                note.title,
                None,
                note.tags,
                f"{note.title or ''}\n{note.content}",
            )
        )

    def index_document(self, document: Document) -> None:
        self._safe(
            lambda: self._index(
                KIND_DOCUMENT,
                document.id,
                document.project_id,
                document.domain_id,
                document.title,
                document.filename,
                document.tags,
                f"{document.title}\n{document.extracted_text or ''}",
            )
        )

    def index_artifact_file(
        self,
        *,
        file_id: uuid.UUID,
        project_id: uuid.UUID,
        domain_id: uuid.UUID | None,
        title: str,
        path: str,
        content: str,
    ) -> None:
        self._safe(
            lambda: self._index(
                KIND_ARTIFACT_FILE,
                file_id,
                project_id,
                domain_id,
                title,
                path,
                [],
                f"{path}\n{content}",
            )
        )

    def remove(self, kind: str, parent_id: uuid.UUID) -> None:
        self._safe(lambda: self.index.delete_parent(kind, parent_id))

    def reset(self) -> None:
        self.index.reset()

    def _index(
        self,
        kind: str,
        parent_id: uuid.UUID,
        project_id: uuid.UUID,
        domain_id: uuid.UUID | None,
        title: str | None,
        path: str | None,
        tags: list[str],
        text: str,
    ) -> None:
        self.index.delete_parent(kind, parent_id)
        chunks = chunk_text(text)
        if not chunks:
            return
        vectors = self.embeddings.embed_texts(chunks)
        self.index.upsert(
            [
                VectorPoint(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    kind=kind,
                    parent_id=parent_id,
                    project_id=project_id,
                    domain_id=domain_id,
                    title=title,
                    path=path,
                    tags=list(tags or []),
                    text=chunk,
                )
                for chunk, vector in zip(chunks, vectors, strict=True)
            ]
        )

    def _safe(self, action) -> None:
        try:
            action()
        except Exception as exc:  # noqa: BLE001 - resilient indexing, never block writes
            logger.warning("search indexing failed: %s", exc)
