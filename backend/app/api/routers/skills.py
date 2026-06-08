"""Skill endpoints, GLOBAL-skill attachment, and SKILL.md export."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.api.deps import get_skill_service
from app.application.skill_service import SkillService
from app.domain.entities import Skill
from app.domain.enums import ScopeKind
from app.schemas.skill import SkillCreate, SkillRead, SkillUpdate

router = APIRouter(tags=["skills"])


def _to_skill_md(skill: Skill) -> str:
    tags = ", ".join(skill.tags)
    return (
        "---\n"
        f"name: {skill.name}\n"
        f"description: {skill.description}\n"
        f"scope: {skill.scope.value}\n"
        f"tags: [{tags}]\n"
        "---\n\n"
        f"{skill.content}\n"
    )


@router.get("/skills", response_model=list[SkillRead])
def list_skills(
    scope: ScopeKind | None = None,
    tag: str | None = None,
    service: SkillService = Depends(get_skill_service),
) -> list[SkillRead]:
    return [SkillRead.model_validate(s) for s in service.list(scope=scope, tag=tag)]


@router.post("/skills", response_model=SkillRead, status_code=201)
def create_skill(
    payload: SkillCreate, service: SkillService = Depends(get_skill_service)
) -> SkillRead:
    skill = service.create(
        scope=payload.scope,
        name=payload.name,
        description=payload.description,
        content=payload.content,
        tags=payload.tags,
        project_slug=payload.project_slug,
    )
    return SkillRead.model_validate(skill)


@router.get("/skills/{skill_id}", response_model=SkillRead)
def get_skill(skill_id: uuid.UUID, service: SkillService = Depends(get_skill_service)) -> SkillRead:
    return SkillRead.model_validate(service.get(skill_id))


@router.patch("/skills/{skill_id}", response_model=SkillRead)
def update_skill(
    skill_id: uuid.UUID,
    payload: SkillUpdate,
    service: SkillService = Depends(get_skill_service),
) -> SkillRead:
    return SkillRead.model_validate(
        service.update(skill_id, payload.model_dump(exclude_unset=True))
    )


@router.delete("/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: uuid.UUID, service: SkillService = Depends(get_skill_service)) -> None:
    service.delete(skill_id)


@router.get("/skills/{skill_id}/export")
def export_skill(
    skill_id: uuid.UUID, service: SkillService = Depends(get_skill_service)
) -> Response:
    skill = service.get(skill_id)
    return Response(
        content=_to_skill_md(skill),
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="SKILL.md"'},
    )


@router.get("/projects/{slug}/skills", response_model=list[SkillRead])
def list_applicable_skills(
    slug: str, service: SkillService = Depends(get_skill_service)
) -> list[SkillRead]:
    return [SkillRead.model_validate(s) for s in service.list_applicable(slug)]


@router.post("/projects/{slug}/skills/{skill_id}", status_code=204)
def attach_skill(
    slug: str, skill_id: uuid.UUID, service: SkillService = Depends(get_skill_service)
) -> None:
    service.attach(slug, skill_id)


@router.delete("/projects/{slug}/skills/{skill_id}", status_code=204)
def detach_skill(
    slug: str, skill_id: uuid.UUID, service: SkillService = Depends(get_skill_service)
) -> None:
    service.detach(slug, skill_id)
