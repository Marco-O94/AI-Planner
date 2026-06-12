"""Dependency wiring: build application services from a request-scoped Session.

The API layer depends only on services; services depend on repository
interfaces; the concrete SQLAlchemy repositories are assembled here.
"""

import secrets
import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, Request
from sqlalchemy.orm import Session

from app.application.artifact_service import ArtifactService
from app.application.artifact_type_service import ArtifactTypeService
from app.application.auth_service import AuthService
from app.application.document_service import DocumentService
from app.application.domain_service import DomainService
from app.application.indexer import SearchIndexer
from app.application.note_service import NoteService
from app.application.note_type_service import NoteTypeService
from app.application.project_service import ProjectService
from app.application.reindex_service import ReindexService
from app.application.search_service import SearchService
from app.application.skill_service import SkillService
from app.application.task_service import TaskService
from app.application.technology_service import TechnologyService
from app.application.template_service import ProjectTemplateService
from app.config import settings
from app.domain.errors import AuthenticationError
from app.infrastructure.db import get_db
from app.infrastructure.embeddings import get_embeddings
from app.infrastructure.extract import extract_text
from app.infrastructure.fulltext import FullTextSearch
from app.infrastructure.qdrant_index import get_vector_index
from app.infrastructure.repositories import (
    SqlArtifactRepository,
    SqlArtifactTypeRepository,
    SqlDocumentRepository,
    SqlDomainRepository,
    SqlNoteRepository,
    SqlNoteTypeRepository,
    SqlProjectRepository,
    SqlProjectTemplateRepository,
    SqlSessionRepository,
    SqlSkillRepository,
    SqlTaskRepository,
    SqlTechnologyRepository,
    SqlUserRepository,
)
from app.infrastructure.security import PwdlibHasher, SecretsTokenGenerator
from app.infrastructure.storage import get_storage


def get_indexer() -> SearchIndexer:
    """Process-shared embeddings + vector index, wrapped in a resilient indexer."""
    return SearchIndexer(get_embeddings(), get_vector_index())


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
        SqlNoteRepository(db),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
        SqlNoteTypeRepository(db),
        indexer=get_indexer(),
    )


def get_note_type_service(db: Session = Depends(get_db)) -> NoteTypeService:
    return NoteTypeService(SqlNoteTypeRepository(db), SqlProjectRepository(db))


def get_task_service(db: Session = Depends(get_db)) -> TaskService:
    return TaskService(
        SqlTaskRepository(db),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
        SqlNoteRepository(db),
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
        SqlNoteRepository(db),
        indexer=get_indexer(),
    )


def get_document_service(db: Session = Depends(get_db)) -> DocumentService:
    return DocumentService(
        SqlDocumentRepository(db),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
        get_storage(),
        extract_text,
        indexer=get_indexer(),
    )


def get_search_service(db: Session = Depends(get_db)) -> SearchService:
    return SearchService(
        FullTextSearch(db),
        get_embeddings(),
        get_vector_index(),
        SqlProjectRepository(db),
        SqlDomainRepository(db),
    )


def get_template_service(db: Session = Depends(get_db)) -> ProjectTemplateService:
    indexer = get_indexer()
    return ProjectTemplateService(
        SqlProjectTemplateRepository(db),
        ProjectService(SqlProjectRepository(db), TechnologyService(SqlTechnologyRepository(db))),
        DomainService(SqlDomainRepository(db), SqlProjectRepository(db)),
        NoteService(
            SqlNoteRepository(db),
            SqlProjectRepository(db),
            SqlDomainRepository(db),
            SqlNoteTypeRepository(db),
            indexer=indexer,
        ),
        TaskService(SqlTaskRepository(db), SqlProjectRepository(db), SqlDomainRepository(db)),
        SkillService(SqlSkillRepository(db), SqlProjectRepository(db)),
    )


def get_reindex_service(db: Session = Depends(get_db)) -> ReindexService:
    return ReindexService(
        get_indexer(),
        SqlNoteRepository(db),
        SqlDocumentRepository(db),
        SqlArtifactRepository(db),
    )


# --- Auth --------------------------------------------------------------------


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        SqlUserRepository(db),
        SqlSessionRepository(db),
        PwdlibHasher(),
        SecretsTokenGenerator(),
        session_ttl_seconds=settings.session_ttl_seconds,
    )


@dataclass(frozen=True)
class Principal:
    """Authenticated caller: either a logged-in user or the headless service key."""

    is_service: bool
    user_id: uuid.UUID | None = None
    email: str | None = None


def require_auth(
    request: Request,
    db: Session = Depends(get_db),
    x_service_api_key: str | None = Header(default=None, alias="X-Service-API-Key"),
) -> Principal:
    """Gate dependency: accept a valid service key OR a valid session cookie, else 401."""
    if x_service_api_key is not None:
        # Guard the empty-key case: compare_digest("", "") is True, so an unset
        # SERVICE_API_KEY would otherwise authenticate any empty header.
        if settings.service_api_key and secrets.compare_digest(
            x_service_api_key, settings.service_api_key
        ):
            return Principal(is_service=True)
        raise AuthenticationError("invalid service api key")

    token = request.cookies.get(settings.session_cookie_name)
    if token:
        user = get_auth_service(db).principal_for_session(token)
        if user is not None:
            return Principal(is_service=False, user_id=user.id, email=user.email)

    raise AuthenticationError("authentication required")
