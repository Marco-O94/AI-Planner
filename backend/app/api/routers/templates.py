"""Project template CRUD, apply, and save-as-template."""

import uuid

from fastapi import APIRouter, Depends

from app.api.deps import get_project_service, get_template_service
from app.application.project_service import ProjectService
from app.application.template_service import ProjectTemplateService
from app.schemas.project import ProjectRead
from app.schemas.template import (
    ApplyTemplateRequest,
    SaveAsTemplateRequest,
    TemplateCreate,
    TemplateRead,
    TemplateUpdate,
)

router = APIRouter(tags=["templates"])


@router.get("/templates", response_model=list[TemplateRead])
def list_templates(
    service: ProjectTemplateService = Depends(get_template_service),
) -> list[TemplateRead]:
    return [TemplateRead.model_validate(t) for t in service.list()]


@router.post("/templates", response_model=TemplateRead, status_code=201)
def create_template(
    payload: TemplateCreate,
    service: ProjectTemplateService = Depends(get_template_service),
) -> TemplateRead:
    template = service.create(
        name=payload.name, definition=payload.definition, description=payload.description
    )
    return TemplateRead.model_validate(template)


@router.get("/templates/{template_id}", response_model=TemplateRead)
def get_template(
    template_id: uuid.UUID, service: ProjectTemplateService = Depends(get_template_service)
) -> TemplateRead:
    return TemplateRead.model_validate(service.get(template_id))


@router.patch("/templates/{template_id}", response_model=TemplateRead)
def update_template(
    template_id: uuid.UUID,
    payload: TemplateUpdate,
    service: ProjectTemplateService = Depends(get_template_service),
) -> TemplateRead:
    return TemplateRead.model_validate(
        service.update(template_id, payload.model_dump(exclude_unset=True))
    )


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(
    template_id: uuid.UUID, service: ProjectTemplateService = Depends(get_template_service)
) -> None:
    service.delete(template_id)


@router.post("/projects/{slug}/save-as-template", response_model=TemplateRead, status_code=201)
def save_as_template(
    slug: str,
    payload: SaveAsTemplateRequest,
    service: ProjectTemplateService = Depends(get_template_service),
) -> TemplateRead:
    template = service.save_as_template(slug, name=payload.name, description=payload.description)
    return TemplateRead.model_validate(template)


@router.post("/projects/{slug}/apply-template", response_model=ProjectRead)
def apply_template(
    slug: str,
    payload: ApplyTemplateRequest,
    template_service: ProjectTemplateService = Depends(get_template_service),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectRead:
    template_service.apply(payload.template_slug, slug)
    return ProjectRead.from_detail(project_service.get_detail(slug))
