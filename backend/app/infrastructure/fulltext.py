"""Postgres full-text search over notes, documents, and artifact files.

Uses ``websearch_to_tsquery`` against the generated ``search_tsv`` columns, with
``ts_rank`` ordering and ``ts_headline`` highlighted snippets. Also powers the
file-explorer listing (documents + current artifact files).
"""

from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.domain.search import FileEntry, SearchHit
from app.domain.vector import KIND_ARTIFACT_FILE, KIND_DOCUMENT, KIND_NOTE

_HEADLINE_OPTS = "StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MinWords=3, MaxWords=18"
_TSQUERY = "websearch_to_tsquery('english', :q)"


class FullTextSearch:
    def __init__(self, db: Session) -> None:
        self.db = db

    def search(
        self,
        q: str,
        *,
        project_id: uuid.UUID | None = None,
        domain_id: uuid.UUID | None = None,
        kinds: list[str] | None = None,
        tag: str | None = None,
        limit: int = 20,
    ) -> list[SearchHit]:
        wanted = set(kinds) if kinds else {KIND_NOTE, KIND_DOCUMENT, KIND_ARTIFACT_FILE}
        hits: list[SearchHit] = []
        if KIND_NOTE in wanted:
            hits += self._search_notes(q, project_id, domain_id, tag, limit)
        if KIND_DOCUMENT in wanted:
            hits += self._search_documents(q, project_id, domain_id, tag, limit)
        if KIND_ARTIFACT_FILE in wanted:
            hits += self._search_artifact_files(q, project_id, domain_id, limit)
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[:limit]

    def _params(self, q: str, limit: int, project_id, domain_id, tag=None) -> dict:
        params = {"q": q, "limit": limit}
        if project_id is not None:
            params["pid"] = project_id
        if domain_id is not None:
            params["did"] = domain_id
        if tag is not None:
            params["tag"] = tag
        return params

    def _search_notes(self, q, project_id, domain_id, tag, limit) -> list[SearchHit]:
        clauses = ""
        if project_id is not None:
            clauses += " AND project_id = :pid"
        if domain_id is not None:
            clauses += " AND domain_id = :did"
        if tag is not None:
            clauses += " AND :tag = ANY(tags)"
        sql = text(
            f"""
            SELECT id, title, project_id, domain_id,
                   ts_rank(search_tsv, {_TSQUERY}) AS score,
                   ts_headline('english', coalesce(title, '') || ' ' || content,
                               {_TSQUERY}, '{_HEADLINE_OPTS}') AS snippet
            FROM notes
            WHERE search_tsv @@ {_TSQUERY}{clauses}
            ORDER BY score DESC LIMIT :limit
            """
        )
        rows = self.db.execute(sql, self._params(q, limit, project_id, domain_id, tag)).mappings()
        return [
            SearchHit(
                kind=KIND_NOTE,
                id=r["id"],
                title=r["title"],
                project_id=r["project_id"],
                domain_id=r["domain_id"],
                snippet=r["snippet"],
                score=float(r["score"]),
            )
            for r in rows
        ]

    def _search_documents(self, q, project_id, domain_id, tag, limit) -> list[SearchHit]:
        clauses = ""
        if project_id is not None:
            clauses += " AND project_id = :pid"
        if domain_id is not None:
            clauses += " AND domain_id = :did"
        if tag is not None:
            clauses += " AND :tag = ANY(tags)"
        sql = text(
            f"""
            SELECT id, title, project_id, domain_id, filename AS path,
                   ts_rank(search_tsv, {_TSQUERY}) AS score,
                   ts_headline('english', coalesce(extracted_text, ''),
                               {_TSQUERY}, '{_HEADLINE_OPTS}') AS snippet
            FROM documents
            WHERE search_tsv @@ {_TSQUERY}{clauses}
            ORDER BY score DESC LIMIT :limit
            """
        )
        rows = self.db.execute(sql, self._params(q, limit, project_id, domain_id, tag)).mappings()
        return [
            SearchHit(
                kind=KIND_DOCUMENT,
                id=r["id"],
                title=r["title"],
                project_id=r["project_id"],
                domain_id=r["domain_id"],
                snippet=r["snippet"],
                score=float(r["score"]),
                path=r["path"],
            )
            for r in rows
        ]

    def _search_artifact_files(self, q, project_id, domain_id, limit) -> list[SearchHit]:
        clauses = ""
        if project_id is not None:
            clauses += " AND a.project_id = :pid"
        if domain_id is not None:
            clauses += " AND a.domain_id = :did"
        sql = text(
            f"""
            SELECT af.id AS id, a.title AS title, a.project_id AS project_id,
                   a.domain_id AS domain_id, af.path AS path,
                   ts_rank(af.search_tsv, {_TSQUERY}) AS score,
                   ts_headline('english', af.content, {_TSQUERY}, '{_HEADLINE_OPTS}') AS snippet
            FROM artifact_files af
            JOIN artifact_versions av ON av.id = af.artifact_version_id
            JOIN artifacts a ON a.current_version_id = av.id
            WHERE af.search_tsv @@ {_TSQUERY}{clauses}
            ORDER BY score DESC LIMIT :limit
            """
        )
        rows = self.db.execute(sql, self._params(q, limit, project_id, domain_id)).mappings()
        return [
            SearchHit(
                kind=KIND_ARTIFACT_FILE,
                id=r["id"],
                title=r["title"],
                project_id=r["project_id"],
                domain_id=r["domain_id"],
                snippet=r["snippet"],
                score=float(r["score"]),
                path=r["path"],
            )
            for r in rows
        ]

    def list_files(
        self,
        *,
        project_id: uuid.UUID | None = None,
        q: str | None = None,
        kind: str | None = None,
        tag: str | None = None,
        limit: int = 100,
    ) -> list[FileEntry]:
        entries: list[FileEntry] = []
        if kind in (None, KIND_DOCUMENT):
            entries += self._list_documents(project_id, q, tag, limit)
        if kind in (None, KIND_ARTIFACT_FILE):
            entries += self._list_artifact_files(project_id, q, limit)
        return entries

    def _list_documents(self, project_id, q, tag, limit) -> list[FileEntry]:
        clauses = ""
        params: dict = {"limit": limit}
        if project_id is not None:
            clauses += " AND d.project_id = :pid"
            params["pid"] = project_id
        if tag is not None:
            clauses += " AND :tag = ANY(d.tags)"
            params["tag"] = tag
        snippet_sql = "NULL AS snippet"
        if q:
            params["q"] = q
            clauses += f" AND d.search_tsv @@ {_TSQUERY}"
            snippet_sql = (
                f"ts_headline('english', coalesce(d.extracted_text, ''), "
                f"{_TSQUERY}, '{_HEADLINE_OPTS}') AS snippet"
            )
        sql = text(
            f"""
            SELECT d.id, p.id AS project_id, p.slug, p.name, d.title,
                   d.filename AS path, d.tags, {snippet_sql}
            FROM documents d JOIN projects p ON p.id = d.project_id
            WHERE 1=1{clauses}
            ORDER BY p.name, d.title LIMIT :limit
            """
        )
        return [
            FileEntry(
                kind=KIND_DOCUMENT,
                id=r["id"],
                project_id=r["project_id"],
                project_slug=r["slug"],
                project_name=r["name"],
                title=r["title"],
                path=r["path"],
                tags=list(r["tags"] or []),
                snippet=r["snippet"],
            )
            for r in self.db.execute(sql, params).mappings()
        ]

    def _list_artifact_files(self, project_id, q, limit) -> list[FileEntry]:
        clauses = ""
        params: dict = {"limit": limit}
        if project_id is not None:
            clauses += " AND a.project_id = :pid"
            params["pid"] = project_id
        snippet_sql = "NULL AS snippet"
        if q:
            params["q"] = q
            clauses += f" AND af.search_tsv @@ {_TSQUERY}"
            snippet_sql = (
                f"ts_headline('english', af.content, {_TSQUERY}, '{_HEADLINE_OPTS}') AS snippet"
            )
        sql = text(
            f"""
            SELECT af.id, p.id AS project_id, p.slug, p.name, a.title,
                   af.path, {snippet_sql}
            FROM artifact_files af
            JOIN artifact_versions av ON av.id = af.artifact_version_id
            JOIN artifacts a ON a.current_version_id = av.id
            JOIN projects p ON p.id = a.project_id
            WHERE 1=1{clauses}
            ORDER BY p.name, a.title LIMIT :limit
            """
        )
        return [
            FileEntry(
                kind=KIND_ARTIFACT_FILE,
                id=r["id"],
                project_id=r["project_id"],
                project_slug=r["slug"],
                project_name=r["name"],
                title=r["title"],
                path=r["path"],
                tags=[],
                snippet=r["snippet"],
            )
            for r in self.db.execute(sql, params).mappings()
        ]
