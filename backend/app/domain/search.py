"""Unified search result + file-explorer read models."""

from __future__ import annotations

import uuid
from dataclasses import dataclass

LEXICAL = "lexical"
SEMANTIC = "semantic"
HYBRID = "hybrid"
SEARCH_MODES = (LEXICAL, SEMANTIC, HYBRID)


@dataclass(frozen=True, slots=True)
class SearchHit:
    kind: str
    id: uuid.UUID
    title: str | None
    project_id: uuid.UUID | None
    domain_id: uuid.UUID | None
    snippet: str
    score: float
    path: str | None = None


@dataclass(frozen=True, slots=True)
class IndexableFile:
    """A current-version artifact file with its parent artifact context."""

    id: uuid.UUID
    project_id: uuid.UUID
    domain_id: uuid.UUID | None
    title: str
    path: str
    content: str


@dataclass(frozen=True, slots=True)
class FileEntry:
    """A saved file (document or artifact file) for the file explorer."""

    kind: str
    id: uuid.UUID
    project_id: uuid.UUID
    project_slug: str
    project_name: str
    title: str
    path: str | None
    tags: list[str]
    snippet: str | None = None
