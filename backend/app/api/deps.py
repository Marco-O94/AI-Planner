"""Dependency wiring: build application services from a request-scoped Session.

The API layer depends only on services; services depend on repository
interfaces; the concrete SQLAlchemy repositories are assembled here.
"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.application.artifact_service import ArtifactService
from app.application.artifact_type_service import ArtifactTypeService
from app.application.document_service import DocumentService
from app.application.domain_service import DomainService
from app.application.indexer import SearchIndexer
from app.application.note_service import NoteService
from app.application.project_service import ProjectService
from app.application.reindex_service import ReindexService
from app.application.search_service import SearchService
from app.application.skill_service import SkillService
from app.application.task_service import TaskService
from app.application.technology_service import TechnologyService
from app.application.template_service import ProjectTemplateService
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
    SqlProjectRepository,
    SqlProjectTemplateRepository,
    SqlSkillRepository,
    SqlTaskRepository,
    SqlTechnologyRepository,
)
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
        indexer=get_indexer(),
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
