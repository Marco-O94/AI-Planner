"""Rebuild the vector collection from Postgres (the source of truth)."""

from __future__ import annotations

from app.application.indexer import SearchIndexer
from app.domain.repositories import ArtifactRepository, DocumentRepository, NoteRepository


class ReindexService:
    def __init__(
        self,
        indexer: SearchIndexer,
        note_repo: NoteRepository,
        document_repo: DocumentRepository,
        artifact_repo: ArtifactRepository,
    ) -> None:
        self.indexer = indexer
        self.note_repo = note_repo
        self.document_repo = document_repo
        self.artifact_repo = artifact_repo

    def rebuild(self) -> dict[str, int]:
        self.indexer.reset()
        notes = self.note_repo.list_all()
        for note in notes:
            self.indexer.index_note(note)
        documents = self.document_repo.list_all()
        for document in documents:
            self.indexer.index_document(document)
        files = self.artifact_repo.iter_indexable_files()
        for file in files:
            self.indexer.index_artifact_file(
                file_id=file.id,
                project_id=file.project_id,
                domain_id=file.domain_id,
                title=file.title,
                path=file.path,
                content=file.content,
            )
        return {
            "notes": len(notes),
            "documents": len(documents),
            "artifact_files": len(files),
        }
