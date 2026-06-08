"""Vector index port (semantic search), framework-agnostic.

The application embeds text and exchanges these value objects; a concrete
adapter (Qdrant) lives in the infrastructure layer.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Protocol

# Indexable entity kinds (also used as Qdrant payload ``type``).
KIND_NOTE = "note"
KIND_DOCUMENT = "document"
KIND_ARTIFACT_FILE = "artifact_file"
ALL_KINDS = (KIND_NOTE, KIND_DOCUMENT, KIND_ARTIFACT_FILE)


@dataclass(frozen=True, slots=True)
class VectorPoint:
    """One embedded chunk. ``parent_id`` links back to the source entity."""

    id: str
    vector: list[float]
    kind: str
    parent_id: uuid.UUID
    project_id: uuid.UUID
    text: str
    domain_id: uuid.UUID | None = None
    title: str | None = None
    path: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class VectorHit:
    kind: str
    parent_id: uuid.UUID
    score: float
    snippet: str
    project_id: uuid.UUID | None = None
    domain_id: uuid.UUID | None = None
    title: str | None = None
    path: str | None = None


class VectorIndex(Protocol):
    def upsert(self, points: list[VectorPoint]) -> None: ...
    def delete_parent(self, kind: str, parent_id: uuid.UUID) -> None: ...
    def search(
        self,
        query_vector: list[float],
        *,
        project_id: uuid.UUID | None = None,
        domain_id: uuid.UUID | None = None,
        kinds: list[str] | None = None,
        limit: int = 10,
    ) -> list[VectorHit]: ...
    def reset(self) -> None: ...
