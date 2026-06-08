"""Technology lookup endpoints."""

from fastapi import APIRouter, Depends

from app.api.deps import get_technology_service
from app.application.technology_service import TechnologyService
from app.domain.enums import TechnologyKind
from app.schemas.technology import TechnologyCreate, TechnologyRead

router = APIRouter(tags=["technologies"])


@router.get("/technologies", response_model=list[TechnologyRead])
def list_technologies(
    kind: TechnologyKind | None = None,
    service: TechnologyService = Depends(get_technology_service),
) -> list[TechnologyRead]:
    return [TechnologyRead.model_validate(t) for t in service.list(kind=kind)]


@router.post("/technologies", response_model=TechnologyRead, status_code=201)
def create_technology(
    payload: TechnologyCreate,
    service: TechnologyService = Depends(get_technology_service),
) -> TechnologyRead:
    return TechnologyRead.model_validate(service.create(payload.kind, payload.name))
