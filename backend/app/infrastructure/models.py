"""SQLAlchemy ORM models for all ProjectNotes tables (DDD-aligned, §1 of the plan).

Cascade and scope invariants are enforced at the DB level (FK ondelete, CHECK
constraints, partial unique indexes). Service-layer enforcement is layered on
top in later phases. Full-text search uses generated ``tsvector`` columns with
GIN indexes; array columns that are queried also get GIN indexes.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import (
    ArtifactStatus,
    PhaseStatus,
    ProjectStatus,
    ScopeKind,
    TaskPriority,
    TaskStatus,
    TechnologyKind,
)
from app.infrastructure.db import Base


def _pg_enum(enum_cls: type, name: str) -> SAEnum:
    """Native Postgres enum that stores each member's ``.value``."""
    return SAEnum(enum_cls, name=name, values_callable=lambda e: [m.value for m in e])


class UUIDPKMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# --- Lookup / reference data -------------------------------------------------


class Technology(UUIDPKMixin, Base):
    __tablename__ = "technologies"
    __table_args__ = (UniqueConstraint("kind", "slug", name="uq_technologies_kind_slug"),)

    kind: Mapped[TechnologyKind] = mapped_column(
        _pg_enum(TechnologyKind, "technology_kind"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)


# --- Project aggregate -------------------------------------------------------


class Project(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        _pg_enum(ProjectStatus, "project_status"),
        nullable=False,
        server_default=ProjectStatus.ACTIVE.value,
    )
    repository_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # "metadata" is reserved on the declarative Base, so map under a safe attr.
    project_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)


class ProjectTechnology(Base):
    __tablename__ = "project_technologies"

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    technology_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("technologies.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    version: Mapped[str | None] = mapped_column(String, nullable=True)


class Domain(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "domains"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_domains_project_slug"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ubiquitous_language: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# --- Knowledge & work --------------------------------------------------------


class NoteType(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "note_types"
    __table_args__ = (
        CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_note_types_scope_project",
        ),
        Index(
            "uq_note_types_global_slug",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NULL"),
        ),
        Index(
            "uq_note_types_project_slug",
            "project_id",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NOT NULL"),
        ),
    )

    scope: Mapped[ScopeKind] = mapped_column(_pg_enum(ScopeKind, "scope_kind"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    key: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    color: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(nullable=False, server_default=text("false"))


class Note(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "notes"
    __table_args__ = (
        Index("ix_notes_search_tsv", "search_tsv", postgresql_using="gin"),
        Index("ix_notes_tags", "tags", postgresql_using="gin"),
        Index("ix_notes_project_id", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("domains.id", ondelete="SET NULL"), nullable=True
    )
    note_type_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("note_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # eager-load: every NoteRead embeds the type summary, so join avoids N+1 on note lists
    note_type: Mapped["NoteType"] = relationship("NoteType", lazy="joined")
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default=text("'{}'")
    )
    search_tsv: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))",
            persisted=True,
        ),
    )


class Task(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_depends_on", "depends_on", postgresql_using="gin"),
        Index("ix_tasks_tags", "tags", postgresql_using="gin"),
        Index("ix_tasks_project_id", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("domains.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        _pg_enum(TaskStatus, "task_status"),
        nullable=False,
        server_default=TaskStatus.TODO.value,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        _pg_enum(TaskPriority, "task_priority"),
        nullable=False,
        server_default=TaskPriority.MEDIUM.value,
    )
    depends_on: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(PgUUID(as_uuid=True)), nullable=False, server_default=text("'{}'")
    )
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default=text("'{}'")
    )


# --- Artifacts ---------------------------------------------------------------


class ArtifactType(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "artifact_types"
    __table_args__ = (
        CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_artifact_types_scope_project",
        ),
        Index(
            "uq_artifact_types_global_slug",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NULL"),
        ),
        Index(
            "uq_artifact_types_project_slug",
            "project_id",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NOT NULL"),
        ),
    )

    scope: Mapped[ScopeKind] = mapped_column(_pg_enum(ScopeKind, "scope_kind"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    output_files: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    is_default: Mapped[bool] = mapped_column(
        nullable=False, server_default=text("false")
    )


class Artifact(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "artifacts"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_artifacts_project_slug"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("domains.id", ondelete="SET NULL"), nullable=True
    )
    artifact_type_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("artifact_types.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[ArtifactStatus] = mapped_column(
        _pg_enum(ArtifactStatus, "artifact_status"),
        nullable=False,
        server_default=ArtifactStatus.DRAFT.value,
    )
    # FK back to a version; use_alter breaks the circular dependency with
    # artifact_versions.artifact_id during DDL emission.
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey(
            "artifact_versions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_artifacts_current_version",
        ),
        nullable=True,
    )


class ArtifactVersion(UUIDPKMixin, Base):
    __tablename__ = "artifact_versions"
    __table_args__ = (
        UniqueConstraint("artifact_id", "version_number", name="uq_artifact_versions_number"),
        Index("ix_artifact_versions_source_note_ids", "source_note_ids", postgresql_using="gin"),
        Index("ix_artifact_versions_source_task_ids", "source_task_ids", postgresql_using="gin"),
    )

    artifact_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("artifacts.id", ondelete="CASCADE"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    source_note_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(PgUUID(as_uuid=True)), nullable=False, server_default=text("'{}'")
    )
    source_task_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(PgUUID(as_uuid=True)), nullable=False, server_default=text("'{}'")
    )
    source_document_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(PgUUID(as_uuid=True)), nullable=False, server_default=text("'{}'")
    )
    change_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ArtifactFile(UUIDPKMixin, Base):
    __tablename__ = "artifact_files"
    __table_args__ = (
        Index("ix_artifact_files_search_tsv", "search_tsv", postgresql_using="gin"),
        Index("ix_artifact_files_version_id", "artifact_version_id"),
    )

    artifact_version_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("artifact_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    path: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    search_tsv: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english', coalesce(path, '') || ' ' || coalesce(content, ''))",
            persisted=True,
        ),
    )


class ArtifactPhase(UUIDPKMixin, Base):
    __tablename__ = "artifact_phases"

    artifact_version_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("artifact_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[PhaseStatus] = mapped_column(
        _pg_enum(PhaseStatus, "phase_status"),
        nullable=False,
        server_default=PhaseStatus.PENDING.value,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# --- Skills ------------------------------------------------------------------


class Skill(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "skills"
    __table_args__ = (
        CheckConstraint(
            "(scope = 'GLOBAL' AND project_id IS NULL) OR "
            "(scope = 'PROJECT' AND project_id IS NOT NULL)",
            name="ck_skills_scope_project",
        ),
        Index(
            "uq_skills_global_slug",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NULL"),
        ),
        Index(
            "uq_skills_project_slug",
            "project_id",
            "slug",
            unique=True,
            postgresql_where=text("project_id IS NOT NULL"),
        ),
        Index("ix_skills_tags", "tags", postgresql_using="gin"),
    )

    scope: Mapped[ScopeKind] = mapped_column(_pg_enum(ScopeKind, "scope_kind"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default=text("'{}'")
    )


class ProjectSkill(Base):
    __tablename__ = "project_skills"

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    )


# --- Documents ---------------------------------------------------------------


class Document(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_search_tsv", "search_tsv", postgresql_using="gin"),
        Index("ix_documents_tags", "tags", postgresql_using="gin"),
        Index("ix_documents_project_id", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("domains.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    storage_path: Mapped[str] = mapped_column(String, nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default=text("'{}'")
    )
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    search_tsv: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english', coalesce(title, '') || ' ' || coalesce(extracted_text, ''))",
            persisted=True,
        ),
    )


# --- Templates ---------------------------------------------------------------


class ProjectTemplate(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "project_templates"

    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    definition: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
