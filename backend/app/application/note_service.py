"""Note service: enforces the note/domain-belongs-to-project invariant."""

import uuid
from dataclasses import replace

from app.domain.entities import Note
from app.domain.enums import NoteType
from app.domain.errors import NotFoundError, ValidationError
from app.domain.repositories import DomainRepository, NoteRepository, ProjectRepository

_UPDATABLE = {"domain_id", "type", "title", "content", "tags"}


class NoteService:
    def __init__(
        self,
        repo: NoteRepository,
        project_repo: ProjectRepository,
        domain_repo: DomainRepository,
    ) -> None:
        self.repo = repo
        self.project_repo = project_repo
        self.domain_repo = domain_repo

    def _require_project_id(self, project_slug: str) -> uuid.UUID:
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project.id

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
        type: NoteType,
        content: str,
        title: str | None = None,
        tags: list[str] | None = None,
        domain_id: uuid.UUID | None = None,
    ) -> Note:
        project_id = self._require_project_id(project_slug)
        self._validate_domain(project_id, domain_id)
        return self.repo.add(
            Note(
                id=uuid.uuid4(),
                project_id=project_id,
                domain_id=domain_id,
                type=type,
                title=title,
                content=content,
                tags=tags or [],
            )
        )

    def get(self, note_id: uuid.UUID) -> Note:
        note = self.repo.get_by_id(note_id)
        if note is None:
            raise NotFoundError("note not found")
        return note

    def list(
        self,
        project_slug: str,
        *,
        domain_id: uuid.UUID | None = None,
        type: NoteType | None = None,
        tag: str | None = None,
    ) -> list[Note]:
        project_id = self._require_project_id(project_slug)
        return self.repo.list(project_id, domain_id=domain_id, type=type, tag=tag)

    def update(self, note_id: uuid.UUID, changes: dict) -> Note:
        note = self.get(note_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        if "domain_id" in applied:
            self._validate_domain(note.project_id, applied["domain_id"])
        return self.repo.update(replace(note, **applied))

    def delete(self, note_id: uuid.UUID) -> None:
        self.repo.delete(self.get(note_id).id)
