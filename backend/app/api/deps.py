"""Dependency wiring: build application services from a request-scoped Session.

The API layer depends only on services; services depend on repository
interfaces; the concrete SQLAlchemy repositories are assembled here.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.application.artifact_service import ArtifactService
from app.application.artifact_type_service import ArtifactTypeService
from app.application.domain_service import DomainService
from app.application.note_service import NoteService
from app.application.project_service import ProjectService
from app.application.skill_service import SkillService
from app.application.task_service import TaskService
from app.application.technology_service import TechnologyService
from app.infrastructure.db import get_db
from app.infrastructure.repositories import (
    SqlArtifactRepository,
    SqlArtifactTypeRepository,
    SqlDomainRepository,
    SqlNoteRepository,
    SqlProjectRepository,
    SqlSkillRepository,
    SqlTaskRepository,
    SqlTechnologyRepository,
)


def get_technology_service(db: Session = Depends(get_db)) -> TechnologyService:
    return TechnologyService(SqlTechnologyRepository(db))


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    return ProjectService(
        SqlProjectRepository(db), TechnologyService(SqlTechnologyRepository(db))
    )


def get_domain_service(db: Session = Depends(get_db)) -> DomainService:
    return DomainService(SqlDomainRepository(db), SqlProjectRepository(db))


def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(
        SqlNoteRepository(db), SqlProjectRepository(db), SqlDomainRepository(db)
    )


def get_task_service(db: Session = Depends(get_db)) -> TaskService:
    return TaskService(
        SqlTaskRepository(db), SqlProjectRepository(db), SqlDomainRepository(db)
    )


def get_artifact_type_service(db: Session = Depends(get_db)) -> ArtifactTypeService:
    return ArtifactTypeService(SqlArtifactTypeRepository(db), SqlProjectRepository(db))


def get_skill_service(db: Session = Depends(get_db)) -> SkillService:
    return SkillService(SqlSkillRepository(db), SqlProjectRepository(db))


def get_artifact_service(db: Session = Depends(get_db)) -> ArtifactService:
    return ArtifactService(
        SqlArtifactRepository(db),
        SqlArtifactTypeRepository(db),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
    )
