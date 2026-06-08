"""Search + file-explorer DTOs."""

import uuid

from pydantic import BaseModel, ConfigDict

from app.domain.search import FileEntry


class SearchHitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    id: uuid.UUID
    title: str | None
    project_id: uuid.UUID | None
    domain_id: uuid.UUID | None
    snippet: str
    score: float
    path: str | None = None


class FileEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    id: uuid.UUID
    title: str
    path: str | None
    tags: list[str]
    snippet: str | None = None


class FileGroupRead(BaseModel):
    project_slug: str
    project_name: str
    files: list[FileEntryRead]


def group_files_by_project(entries: list[FileEntry]) -> list[FileGroupRead]:
    groups: dict[str, FileGroupRead] = {}
    for entry in entries:
        group = groups.get(entry.project_slug)
        if group is None:
            group = FileGroupRead(
                project_slug=entry.project_slug, project_name=entry.project_name, files=[]
            )
            groups[entry.project_slug] = group
        group.files.append(FileEntryRead.model_validate(entry))
    return list(groups.values())
