"""Project endpoints, including technology attach/detach."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_project_service, get_template_service
from app.application.project_service import ProjectService
from app.application.template_service import ProjectTemplateService
from app.domain.enums import ProjectStatus
from app.schemas.project import (
    AttachTechnologyRequest,
    ProjectCreate,
    ProjectRead,
    ProjectTechnologyRead,
    ProjectUpdate,
)

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(
    search: str | None = None,
    language: str | None = None,
    framework: str | None = None,
    database: str | None = None,
    status: ProjectStatus | None = None,
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectRead]:
    details = service.list(
        search=search,
        language=language,
        framework=framework,
        database=database,
        status=status,
    )
    return [ProjectRead.from_detail(d) for d in details]


@router.post("/projects", response_model=ProjectRead, status_code=201)
def create_project(
    payload: ProjectCreate,
    service: ProjectService = Depends(get_project_service),
    template_service: ProjectTemplateService = Depends(get_template_service),
) -> ProjectRead:
    detail = service.create(
        name=payload.name,
        description=payload.description,
        status=payload.status,
        repository_url=payload.repository_url,
        metadata=payload.metadata,
        technologies=[t.model_dump() for t in payload.technologies],
    )
    if payload.template_slug:
        detail = template_service.apply(payload.template_slug, detail.project.slug)
    return ProjectRead.from_detail(detail)


@router.get("/projects/{slug}", response_model=ProjectRead)
def get_project(
    slug: str, service: ProjectService = Depends(get_project_service)
) -> ProjectRead:
    return ProjectRead.from_detail(service.get_detail(slug))


@router.patch("/projects/{slug}", response_model=ProjectRead)
def update_project(
    slug: str,
    payload: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    return ProjectRead.from_detail(service.update(slug, payload.model_dump(exclude_unset=True)))


@router.delete("/projects/{slug}", status_code=204)
def delete_project(slug: str, service: ProjectService = Depends(get_project_service)) -> None:
    service.delete(slug)


@router.get("/projects/{slug}/technologies", response_model=list[ProjectTechnologyRead])
def list_project_technologies(
    slug: str, service: ProjectService = Depends(get_project_service)
) -> list[ProjectTechnologyRead]:
    return [ProjectTechnologyRead.from_ref(t) for t in service.list_technologies(slug)]


@router.post("/projects/{slug}/technologies", response_model=ProjectRead)
def attach_technology(
    slug: str,
    payload: AttachTechnologyRequest,
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    detail = service.attach_technology(
        slug, kind=payload.kind, name=payload.name, version=payload.version
    )
    return ProjectRead.from_detail(detail)


@router.delete("/projects/{slug}/technologies/{technology_id}", response_model=ProjectRead)
def detach_technology(
    slug: str,
    technology_id: uuid.UUID,
    service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    return ProjectRead.from_detail(service.detach_technology(slug, technology_id))
