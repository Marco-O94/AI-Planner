"""Domain (bounded context) endpoints."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_domain_service
from app.application.domain_service import DomainService
from app.schemas.domain import DomainCreate, DomainRead, DomainUpdate

router = APIRouter(tags=["domains"])


@router.get("/projects/{slug}/domains", response_model=list[DomainRead])
def list_domains(
    slug: str, service: DomainService = Depends(get_domain_service)
) -> list[DomainRead]:
    return [DomainRead.model_validate(d) for d in service.list(slug)]


@router.post("/projects/{slug}/domains", response_model=DomainRead, status_code=201)
def create_domain(
    slug: str,
    payload: DomainCreate,
    service: DomainService = Depends(get_domain_service),
) -> DomainRead:
    domain = service.create(
        slug,
        name=payload.name,
        description=payload.description,
        ubiquitous_language=payload.ubiquitous_language,
    )
    return DomainRead.model_validate(domain)


@router.get("/domains/{domain_id}", response_model=DomainRead)
def get_domain(
    domain_id: uuid.UUID, service: DomainService = Depends(get_domain_service)
) -> DomainRead:
    return DomainRead.model_validate(service.get(domain_id))


@router.patch("/domains/{domain_id}", response_model=DomainRead)
def update_domain(
    domain_id: uuid.UUID,
    payload: DomainUpdate,
    service: DomainService = Depends(get_domain_service),
) -> DomainRead:
    return DomainRead.model_validate(
        service.update(domain_id, payload.model_dump(exclude_unset=True))
    )


@router.delete("/domains/{domain_id}", status_code=204)
def delete_domain(
    domain_id: uuid.UUID, service: DomainService = Depends(get_domain_service)
) -> None:
    service.delete(domain_id)
