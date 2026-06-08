"""Unified search + file-explorer endpoints."""

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_search_service
from app.application.search_service import SearchService
from app.domain.search import HYBRID
from app.schemas.search import FileGroupRead, SearchHitRead, group_files_by_project

router = APIRouter(tags=["search"])


def _run_search(
    service: SearchService,
    *,
    q: str,
    mode: str,
    project_slug: str | None,
    domain_slug: str | None,
    kinds: list[str] | None,
    tag: str | None,
    limit: int,
) -> list[SearchHitRead]:
    hits = service.search(
        q,
        mode=mode,
        project_slug=project_slug,
        domain_slug=domain_slug,
        kinds=kinds,
        tag=tag,
        limit=limit,
    )
    return [SearchHitRead.model_validate(h) for h in hits]


@router.get("/search", response_model=list[SearchHitRead])
def search(
    q: str,
    mode: str = HYBRID,
    project_slug: str | None = None,
    domain_slug: str | None = None,
    kinds: list[str] | None = Query(default=None),
    tag: str | None = None,
    limit: int = 20,
    service: SearchService = Depends(get_search_service),
) -> list[SearchHitRead]:
    return _run_search(
        service,
        q=q,
        mode=mode,
        project_slug=project_slug,
        domain_slug=domain_slug,
        kinds=kinds,
        tag=tag,
        limit=limit,
    )


@router.get("/projects/{slug}/search", response_model=list[SearchHitRead])
def search_in_project(
    slug: str,
    q: str,
    mode: str = HYBRID,
    domain_slug: str | None = None,
    kinds: list[str] | None = Query(default=None),
    tag: str | None = None,
    limit: int = 20,
    service: SearchService = Depends(get_search_service),
) -> list[SearchHitRead]:
    return _run_search(
        service,
        q=q,
        mode=mode,
        project_slug=slug,
        domain_slug=domain_slug,
        kinds=kinds,
        tag=tag,
        limit=limit,
    )


@router.get("/files", response_model=list[FileGroupRead])
def list_files(
    project_slug: str | None = None,
    q: str | None = None,
    kind: str | None = None,
    tag: str | None = None,
    limit: int = 100,
    service: SearchService = Depends(get_search_service),
) -> list[FileGroupRead]:
    entries = service.list_files(
        project_slug=project_slug, q=q, kind=kind, tag=tag, limit=limit
    )
    return group_files_by_project(entries)


@router.get("/projects/{slug}/files", response_model=list[FileGroupRead])
def list_project_files(
    slug: str,
    q: str | None = None,
    kind: str | None = None,
    tag: str | None = None,
    limit: int = 100,
    service: SearchService = Depends(get_search_service),
) -> list[FileGroupRead]:
    entries = service.list_files(project_slug=slug, q=q, kind=kind, tag=tag, limit=limit)
    return group_files_by_project(entries)
