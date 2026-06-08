"""Qdrant adapter implementing the VectorIndex port."""

from __future__ import annotations

import uuid
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client import models as qm

from app.config import settings
from app.domain.vector import VectorHit, VectorPoint


class QdrantVectorIndex:
    def __init__(self, url: str, collection: str, dimension: int) -> None:
        # check_compatibility silences a cosmetic client/server minor-version warning.
        self._client = QdrantClient(url=url, check_compatibility=False)
        self._collection = collection
        self._dimension = dimension
        self._ready = False

    def _ensure_collection(self) -> None:
        if self._ready:
            return
        if not self._client.collection_exists(self._collection):
            self._client.create_collection(
                collection_name=self._collection,
                vectors_config=qm.VectorParams(
                    size=self._dimension, distance=qm.Distance.COSINE
                ),
            )
        self._ready = True

    @staticmethod
    def _payload(point: VectorPoint) -> dict:
        return {
            "type": point.kind,
            "parent_id": str(point.parent_id),
            "project_id": str(point.project_id),
            "domain_id": str(point.domain_id) if point.domain_id else None,
            "title": point.title,
            "path": point.path,
            "tags": point.tags,
            "text": point.text,
        }

    def upsert(self, points: list[VectorPoint]) -> None:
        if not points:
            return
        self._ensure_collection()
        self._client.upsert(
            collection_name=self._collection,
            points=[
                qm.PointStruct(id=p.id, vector=p.vector, payload=self._payload(p))
                for p in points
            ],
        )

    def delete_parent(self, kind: str, parent_id: uuid.UUID) -> None:
        self._ensure_collection()
        self._client.delete(
            collection_name=self._collection,
            points_selector=qm.FilterSelector(
                filter=qm.Filter(
                    must=[
                        qm.FieldCondition(key="type", match=qm.MatchValue(value=kind)),
                        qm.FieldCondition(
                            key="parent_id", match=qm.MatchValue(value=str(parent_id))
                        ),
                    ]
                )
            ),
        )

    def search(
        self,
        query_vector: list[float],
        *,
        project_id: uuid.UUID | None = None,
        domain_id: uuid.UUID | None = None,
        kinds: list[str] | None = None,
        limit: int = 10,
    ) -> list[VectorHit]:
        self._ensure_collection()
        must: list[qm.FieldCondition] = []
        if project_id is not None:
            must.append(
                qm.FieldCondition(key="project_id", match=qm.MatchValue(value=str(project_id)))
            )
        if domain_id is not None:
            must.append(
                qm.FieldCondition(key="domain_id", match=qm.MatchValue(value=str(domain_id)))
            )
        if kinds:
            must.append(qm.FieldCondition(key="type", match=qm.MatchAny(any=list(kinds))))
        query_filter = qm.Filter(must=must) if must else None
        response = self._client.query_points(
            collection_name=self._collection,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )
        return [self._to_hit(point) for point in response.points]

    @staticmethod
    def _to_hit(point) -> VectorHit:
        payload = point.payload or {}
        domain_raw = payload.get("domain_id")
        project_raw = payload.get("project_id")
        return VectorHit(
            kind=payload.get("type", ""),
            parent_id=uuid.UUID(payload["parent_id"]),
            score=float(point.score),
            snippet=payload.get("text", ""),
            project_id=uuid.UUID(project_raw) if project_raw else None,
            domain_id=uuid.UUID(domain_raw) if domain_raw else None,
            title=payload.get("title"),
            path=payload.get("path"),
        )

    def reset(self) -> None:
        if self._client.collection_exists(self._collection):
            self._client.delete_collection(self._collection)
        self._ready = False
        self._ensure_collection()


@lru_cache
def get_vector_index() -> QdrantVectorIndex:
    from app.infrastructure.embeddings import get_embeddings

    return QdrantVectorIndex(
        settings.qdrant_url, settings.vector_collection, get_embeddings().dimension
    )
