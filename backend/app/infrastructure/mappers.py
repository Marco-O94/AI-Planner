"""ORM <-> domain entity mapping.

Enum columns already deserialize to their Python enum members, so mapping is a
straight field copy (plus the ``metadata`` attribute alias on Project).
"""

from app.domain import entities as e
from app.infrastructure import models as m


def technology_to_domain(o: m.Technology) -> e.Technology:
    return e.Technology(id=o.id, kind=o.kind, name=o.name, slug=o.slug)


def project_to_domain(o: m.Project) -> e.Project:
    return e.Project(
        id=o.id,
        name=o.name,
        slug=o.slug,
        status=o.status,
        description=o.description,
        repository_url=o.repository_url,
        metadata=o.project_metadata,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def domain_to_domain(o: m.Domain) -> e.Domain:
    return e.Domain(
        id=o.id,
        project_id=o.project_id,
        name=o.name,
        slug=o.slug,
        description=o.description,
        ubiquitous_language=o.ubiquitous_language,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def note_to_domain(o: m.Note) -> e.Note:
    return e.Note(
        id=o.id,
        project_id=o.project_id,
        domain_id=o.domain_id,
        type=o.type,
        title=o.title,
        content=o.content,
        tags=list(o.tags or []),
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def task_to_domain(o: m.Task) -> e.Task:
    return e.Task(
        id=o.id,
        project_id=o.project_id,
        domain_id=o.domain_id,
        title=o.title,
        description=o.description,
        status=o.status,
        priority=o.priority,
        depends_on=list(o.depends_on or []),
        tags=list(o.tags or []),
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def artifact_type_to_domain(o: m.ArtifactType) -> e.ArtifactType:
    return e.ArtifactType(
        id=o.id,
        scope=o.scope,
        project_id=o.project_id,
        name=o.name,
        slug=o.slug,
        description=o.description,
        instructions=o.instructions,
        output_files=list(o.output_files or []),
        is_default=o.is_default,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def artifact_to_domain(o: m.Artifact) -> e.Artifact:
    return e.Artifact(
        id=o.id,
        project_id=o.project_id,
        domain_id=o.domain_id,
        artifact_type_id=o.artifact_type_id,
        title=o.title,
        slug=o.slug,
        status=o.status,
        current_version_id=o.current_version_id,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def artifact_version_to_domain(o: m.ArtifactVersion) -> e.ArtifactVersion:
    return e.ArtifactVersion(
        id=o.id,
        artifact_id=o.artifact_id,
        version_number=o.version_number,
        source_note_ids=list(o.source_note_ids or []),
        source_task_ids=list(o.source_task_ids or []),
        source_document_ids=list(o.source_document_ids or []),
        change_note=o.change_note,
        created_at=o.created_at,
    )


def artifact_file_to_domain(o: m.ArtifactFile) -> e.ArtifactFile:
    return e.ArtifactFile(
        id=o.id,
        artifact_version_id=o.artifact_version_id,
        path=o.path,
        content=o.content,
        order_index=o.order_index,
        note=o.note,
    )


def artifact_phase_to_domain(o: m.ArtifactPhase) -> e.ArtifactPhase:
    return e.ArtifactPhase(
        id=o.id,
        artifact_version_id=o.artifact_version_id,
        order_index=o.order_index,
        title=o.title,
        status=o.status,
        note=o.note,
        updated_at=o.updated_at,
    )


def document_to_domain(o: m.Document) -> e.Document:
    return e.Document(
        id=o.id,
        project_id=o.project_id,
        domain_id=o.domain_id,
        title=o.title,
        filename=o.filename,
        mime_type=o.mime_type,
        storage_path=o.storage_path,
        extracted_text=o.extracted_text,
        tags=list(o.tags or []),
        indexed_at=o.indexed_at,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def project_template_to_domain(o: m.ProjectTemplate) -> e.ProjectTemplate:
    return e.ProjectTemplate(
        id=o.id,
        name=o.name,
        slug=o.slug,
        description=o.description,
        definition=dict(o.definition or {}),
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def skill_to_domain(o: m.Skill) -> e.Skill:
    return e.Skill(
        id=o.id,
        scope=o.scope,
        project_id=o.project_id,
        name=o.name,
        slug=o.slug,
        description=o.description,
        content=o.content,
        tags=list(o.tags or []),
        created_at=o.created_at,
        updated_at=o.updated_at,
    )
