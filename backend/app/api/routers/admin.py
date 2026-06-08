"""Admin operations: rebuild the vector index from Postgres."""

from fastapi import APIRouter, Depends

from app.api.deps import get_reindex_service
from app.application.reindex_service import ReindexService

router = APIRouter(tags=["admin"])


@router.post("/admin/reindex")
def reindex(service: ReindexService = Depends(get_reindex_service)) -> dict[str, int]:
    return service.rebuild()
