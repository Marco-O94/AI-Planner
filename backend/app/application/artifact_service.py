"""Artifact service: typed, versioned outputs.

Saving an artifact creates version 1 (new title/slug) or appends a new version
(existing title/slug), always pointing ``current_version_id`` at the newest
version. Files are validated against the type's manifest (coverage, not a hard
failure) and phases are parsed from a primary markdown file when present.
"""

from __future__ import annotations

import difflib
import uuid
from dataclasses import replace

from slugify import slugify

from app.application.markdown import parse_phase_titles
from app.domain.entities import Artifact, ArtifactFile, ArtifactPhase, ArtifactVersion
from app.domain.enums import ArtifactStatus, PhaseStatus
from app.domain.errors import NotFoundError, ValidationError
from app.domain.read_models import ArtifactDetail, ManifestCoverage, VersionRef
from app.domain.repositories import (
    ArtifactRepository,
    ArtifactTypeRepository,
    DomainRepository,
    ProjectRepository,
)
from app.domain.vector import KIND_ARTIFACT_FILE

_UPDATABLE = {"title", "status", "domain_id"}


class ArtifactService:
    def __init__(
        self,
        repo: ArtifactRepository,
        type_repo: ArtifactTypeRepository,
        project_repo: ProjectRepository,
        domain_repo: DomainRepository,
        indexer=None,
    ) -> None:
        self.repo = repo
        self.type_repo = type_repo
        self.project_repo = project_repo
        self.domain_repo = domain_repo
        self.indexer = indexer

    # --- helpers ---------------------------------------------------------

    def _require_project(self, project_slug: str):
        project = self.project_repo.get_by_slug(project_slug)
        if project is None:
            raise NotFoundError(f"project '{project_slug}' not found")
        return project

    def _resolve_type(self, type_slug: str, project_id: uuid.UUID):
        artifact_type = self.type_repo.get_by_slug(
            type_slug, project_id
        ) or self.type_repo.get_by_slug(type_slug, None)
        if artifact_type is None:
            raise NotFoundError(f"artifact type '{type_slug}' not found")
        return artifact_type

    def _validate_domain(self, project_id: uuid.UUID, domain_id: uuid.UUID | None) -> None:
        if domain_id is None:
            return
        domain = self.domain_repo.get_by_id(domain_id)
        if domain is None or domain.project_id != project_id:
            raise ValidationError("domain does not belong to this project")

    @staticmethod
    def _coverage(manifest: list[dict], file_paths: list[str]) -> ManifestCoverage:
        declared = {entry["path"] for entry in manifest if entry.get("path")}
        produced = set(file_paths)
        return ManifestCoverage(
            present=sorted(declared & produced),
            missing=sorted(declared - produced),
            extra=sorted(produced - declared),
        )

    @staticmethod
    def _pick_primary(manifest: list[dict], files: list[dict]) -> dict | None:
        declared = [entry["path"] for entry in manifest if entry.get("path")]
        for path in declared:
            for f in files:
                if f["path"] == path:
                    return f
        for f in files:
            if f["path"].lower().endswith(".md"):
                return f
        return files[0] if files else None

    # --- commands --------------------------------------------------------

    def save(
        self,
        *,
        project_slug: str,
        artifact_type_slug: str,
        title: str,
        files: list[dict],
        domain_id: uuid.UUID | None = None,
        source_note_ids: list[uuid.UUID] | None = None,
        source_task_ids: list[uuid.UUID] | None = None,
        source_document_ids: list[uuid.UUID] | None = None,
        change_note: str | None = None,
    ) -> ArtifactDetail:
        if not files:
            raise ValidationError("at least one file is required")
        project = self._require_project(project_slug)
        artifact_type = self._resolve_type(artifact_type_slug, project.id)
        self._validate_domain(project.id, domain_id)

        slug = slugify(title) or "artifact"
        artifact = self.repo.get_by_slug(project.id, slug)
        previous_files = (
            self.repo.list_files(artifact.current_version_id)
            if artifact is not None and artifact.current_version_id is not None
            else []
        )
        if artifact is None:
            artifact = self.repo.add(
                Artifact(
                    id=uuid.uuid4(),
                    project_id=project.id,
                    domain_id=domain_id,
                    artifact_type_id=artifact_type.id,
                    title=title,
                    slug=slug,
                    status=ArtifactStatus.DRAFT,
                    current_version_id=None,
                )
            )

        version = self.repo.add_version(
            ArtifactVersion(
                id=uuid.uuid4(),
                artifact_id=artifact.id,
                version_number=self.repo.next_version_number(artifact.id),
                source_note_ids=source_note_ids or [],
                source_task_ids=source_task_ids or [],
                source_document_ids=source_document_ids or [],
                change_note=change_note,
            )
        )
        new_files = self.repo.add_files(
            [
                ArtifactFile(
                    id=uuid.uuid4(),
                    artifact_version_id=version.id,
                    path=f["path"],
                    content=f["content"],
                    note=f.get("note"),
                    order_index=index,
                )
                for index, f in enumerate(files)
            ]
        )
        self._create_phases(artifact_type.output_files, files, version.id)
        self.repo.set_current_version(artifact.id, version.id)
        self._reindex_files(artifact, previous_files, new_files)
        return self.get_detail(artifact.id)

    def _reindex_files(self, artifact, previous_files, new_files) -> None:
        if self.indexer is None:
            return
        for old in previous_files:
            self.indexer.remove(KIND_ARTIFACT_FILE, old.id)
        for file in new_files:
            self.indexer.index_artifact_file(
                file_id=file.id,
                project_id=artifact.project_id,
                domain_id=artifact.domain_id,
                title=artifact.title,
                path=file.path,
                content=file.content,
            )

    def _create_phases(
        self, manifest: list[dict], files: list[dict], version_id: uuid.UUID
    ) -> None:
        primary = self._pick_primary(manifest, files)
        if primary is None:
            return
        titles = parse_phase_titles(primary["content"])
        if not titles:
            return
        self.repo.add_phases(
            [
                ArtifactPhase(
                    id=uuid.uuid4(),
                    artifact_version_id=version_id,
                    order_index=index,
                    title=title,
                    status=PhaseStatus.PENDING,
                )
                for index, title in enumerate(titles)
            ]
        )

    def update(self, artifact_id: uuid.UUID, changes: dict) -> ArtifactDetail:
        artifact = self._require(artifact_id)
        applied = {k: v for k, v in changes.items() if k in _UPDATABLE}
        if "domain_id" in applied:
            self._validate_domain(artifact.project_id, applied["domain_id"])
        self.repo.update(replace(artifact, **applied))
        return self.get_detail(artifact_id)

    def delete(self, artifact_id: uuid.UUID) -> None:
        artifact = self._require(artifact_id)
        if self.indexer is not None and artifact.current_version_id is not None:
            for file in self.repo.list_files(artifact.current_version_id):
                self.indexer.remove(KIND_ARTIFACT_FILE, file.id)
        self.repo.delete(artifact.id)

    def update_phase(
        self,
        artifact_id: uuid.UUID,
        phase_id: uuid.UUID,
        *,
        status: PhaseStatus,
        note: str | None = None,
    ) -> ArtifactPhase:
        self._require(artifact_id)
        phase = self.repo.get_phase(phase_id)
        if phase is None:
            raise NotFoundError("phase not found")
        return self.repo.update_phase(replace(phase, status=status, note=note))

    # --- queries ---------------------------------------------------------

    def _require(self, artifact_id: uuid.UUID) -> Artifact:
        artifact = self.repo.get_by_id(artifact_id)
        if artifact is None:
            raise NotFoundError("artifact not found")
        return artifact

    def list(self, project_slug: str, *, artifact_type_slug: str | None = None) -> list[Artifact]:
        project = self._require_project(project_slug)
        type_id = None
        if artifact_type_slug is not None:
            type_id = self._resolve_type(artifact_type_slug, project.id).id
        return self.repo.list(project.id, artifact_type_id=type_id)

    def get_detail(self, artifact_id: uuid.UUID) -> ArtifactDetail:
        artifact = self._require(artifact_id)
        artifact_type = self.type_repo.get_by_id(artifact.artifact_type_id)
        current = (
            self.repo.get_version_by_id(artifact.current_version_id)
            if artifact.current_version_id
            else None
        )
        files = self.repo.list_files(current.id) if current else []
        phases = self.repo.list_phases(current.id) if current else []
        versions = [
            VersionRef(
                version_number=v.version_number,
                id=v.id,
                created_at=v.created_at,
                change_note=v.change_note,
            )
            for v in self.repo.list_versions(artifact.id)
        ]
        coverage = self._coverage(
            artifact_type.output_files if artifact_type else [], [f.path for f in files]
        )
        return ArtifactDetail(
            artifact=artifact,
            artifact_type=artifact_type,
            current_version=current,
            files=files,
            phases=phases,
            versions=versions,
            coverage=coverage,
        )

    def list_versions(self, artifact_id: uuid.UUID) -> list[ArtifactVersion]:
        self._require(artifact_id)
        return self.repo.list_versions(artifact_id)

    def get_version_files(
        self, artifact_id: uuid.UUID, version_number: int
    ) -> tuple[ArtifactVersion, list[ArtifactFile]]:
        self._require(artifact_id)
        version = self.repo.get_version(artifact_id, version_number)
        if version is None:
            raise NotFoundError("version not found")
        return version, self.repo.list_files(version.id)

    def diff(self, artifact_id: uuid.UUID, *, from_version: int, to_version: int, path: str) -> str:
        _, from_files = self.get_version_files(artifact_id, from_version)
        _, to_files = self.get_version_files(artifact_id, to_version)
        before = next((f.content for f in from_files if f.path == path), "")
        after = next((f.content for f in to_files if f.path == path), "")
        diff = difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"{path}@v{from_version}",
            tofile=f"{path}@v{to_version}",
        )
        return "".join(diff)

    def export_files(
        self, artifact_id: uuid.UUID, *, version_number: int | None = None
    ) -> tuple[Artifact, list[ArtifactFile]]:
        artifact = self._require(artifact_id)
        if version_number is not None:
            _, files = self.get_version_files(artifact_id, version_number)
            return artifact, files
        if artifact.current_version_id is None:
            return artifact, []
        return artifact, self.repo.list_files(artifact.current_version_id)

    def artifacts_for_note(self, note_id: uuid.UUID) -> list[Artifact]:
        return self.repo.list_by_source_note(note_id)

    def artifacts_for_task(self, task_id: uuid.UUID) -> list[Artifact]:
        return self.repo.list_by_source_task(task_id)
