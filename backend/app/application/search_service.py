"""Unified search: lexical (Postgres FTS), semantic (Qdrant), and hybrid (RRF)."""

from __future__ import annotations

import uuid
from dataclasses import replace

from app.domain.errors import NotFoundError, ValidationError
from app.domain.search import HYBRID, LEXICAL, SEMANTIC, FileEntry, SearchHit

_RRF_K = 60


class SearchService:
    def __init__(self, fulltext, embeddings, index, project_repo, domain_repo) -> None:
        self.fulltext = fulltext
        self.embeddings = embeddings
        self.index = index
        self.project_repo = project_repo
        self.domain_repo = domain_repo

    def _scope(
        self, project_slug: str | None, domain_slug: str | None
    ) -> tuple[uuid.UUID | None, uuid.UUID | None]:
        if domain_slug and not project_slug:
            raise ValidationError("domain_slug requires project_slug")
        if not project_slug:
            return None, None
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        if not domain_slug:
            return project.id, None
        domain = self.domain_repo.get_by_slug(project.id, domain_slug)
        if domain is None:
            raise NotFoundError(f"domain '{domain_slug}' not found")
        return project.id, domain.id

    def search(
        self,
        q: str,
        *,
        mode: str = HYBRID,
        project_slug: str | None = None,
        domain_slug: str | None = None,
        kinds: list[str] | None = None,
        tag: str | None = None,
        limit: int = 20,
    ) -> list[SearchHit]:
        if not q or not q.strip():
            return []
        project_id, domain_id = self._scope(project_slug, domain_slug)
        if mode == LEXICAL:
            return self.fulltext.search(
                q, project_id=project_id, domain_id=domain_id, kinds=kinds, tag=tag, limit=limit
            )
        semantic = self._semantic(q, project_id, domain_id, kinds, limit)
        if mode == SEMANTIC:
            return semantic
        lexical = self.fulltext.search(
            q, project_id=project_id, domain_id=domain_id, kinds=kinds, tag=tag, limit=limit
        )
        return self._reciprocal_rank_fusion(lexical, semantic, limit)

    def _semantic(self, q, project_id, domain_id, kinds, limit) -> list[SearchHit]:
        try:
            vector = self.embeddings.embed_query(q)
        except Exception:  # noqa: BLE001 - degrade to no semantic hits
            return []
        hits = self.index.search(
            vector, project_id=project_id, domain_id=domain_id, kinds=kinds, limit=limit
        )
        return [
            SearchHit(
                kind=h.kind,
                id=h.parent_id,
                title=h.title,
                project_id=h.project_id,
                domain_id=h.domain_id,
                snippet=h.snippet,
                score=h.score,
                path=h.path,
            )
            for h in hits
        ]

    @staticmethod
    def _reciprocal_rank_fusion(
        lexical: list[SearchHit], semantic: list[SearchHit], limit: int
    ) -> list[SearchHit]:
        scores: dict[tuple[str, uuid.UUID], float] = {}
        best: dict[tuple[str, uuid.UUID], SearchHit] = {}
        for ranked in (lexical, semantic):
            for rank, hit in enumerate(ranked):
                key = (hit.kind, hit.id)
                scores[key] = scores.get(key, 0.0) + 1.0 / (_RRF_K + rank + 1)
                best.setdefault(key, hit)
        ordered = sorted(scores, key=lambda key: scores[key], reverse=True)[:limit]
        return [replace(best[key], score=scores[key]) for key in ordered]

    def list_files(
        self,
        *,
        project_slug: str | None = None,
        q: str | None = None,
        kind: str | None = None,
        tag: str | None = None,
        limit: int = 100,
    ) -> list[FileEntry]:
        project_id = None
        if project_slug:
            project = self.project_repo.get_by_slug(project_slug)
            if project is None:
                raise NotFoundError(f"project '{project_slug}' not found")
            project_id = project.id
        return self.fulltext.list_files(
            project_id=project_id, q=q, kind=kind, tag=tag, limit=limit
        )
