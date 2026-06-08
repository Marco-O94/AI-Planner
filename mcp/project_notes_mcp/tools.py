"""Tool implementations — the logic behind each MCP tool.

Kept separate from ``server.py`` (the FastMCP wiring) so the behaviour can be
unit-tested by calling these functions directly with a mock-backed
:class:`BackendClient`, no MCP runtime required.

Each function takes the client as its first argument, calls the backend, and
(for the two assembly tools) delegates markdown rendering to ``formatting``.
"""

from __future__ import annotations

from typing import Any

from .client import BackendClient
from .formatting import render_generation_bundle, render_project_context

JSON = dict[str, Any]


# -- discovery -------------------------------------------------------------


def list_projects(client: BackendClient) -> list[JSON]:
    projects = client.list_projects()
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "slug": p["slug"],
            "status": p.get("status"),
            "tech_stack": [t["name"] for t in p.get("technologies") or []],
        }
        for p in projects
    ]


def list_domains(client: BackendClient, project_slug: str) -> list[JSON]:
    return [
        {
            "id": d["id"],
            "name": d["name"],
            "slug": d["slug"],
            "description": d.get("description"),
        }
        for d in client.list_domains(project_slug)
    ]


def get_project_context(
    client: BackendClient, project_slug: str, domain_slug: str | None = None
) -> str:
    project = client.get_project(project_slug)
    return render_project_context(
        project=project,
        domains=client.list_domains(project_slug),
        notes=client.list_notes(project_slug),
        tasks=client.list_tasks(project_slug),
        documents=client.list_documents(project_slug),
        skills=client.list_project_skills(project_slug),
        domain_slug=domain_slug,
    )


# -- artifact types --------------------------------------------------------


def list_artifact_types(
    client: BackendClient, project_slug: str | None = None
) -> list[JSON]:
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "slug": t["slug"],
            "scope": t.get("scope"),
            "description": t.get("description"),
            "is_default": t.get("is_default"),
            "output_files": t.get("output_files") or [],
        }
        for t in client.list_artifact_types(project_slug)
    ]


def get_artifact_type(
    client: BackendClient, type_slug: str, project_slug: str | None = None
) -> JSON:
    return _resolve_artifact_type(client, type_slug, project_slug)


# -- artifacts -------------------------------------------------------------


def list_artifacts(
    client: BackendClient, project_slug: str, artifact_type: str | None = None
) -> list[JSON]:
    return client.list_artifacts(project_slug, artifact_type=artifact_type)


def get_artifact(client: BackendClient, artifact_id: str) -> JSON:
    return client.get_artifact(artifact_id)


def list_artifact_versions(client: BackendClient, artifact_id: str) -> list[JSON]:
    return client.list_versions(artifact_id)


def get_artifact_version(
    client: BackendClient, artifact_id: str, version_number: int
) -> JSON:
    return client.get_version(artifact_id, version_number)


# -- notes / tasks / documents --------------------------------------------


def list_tasks(
    client: BackendClient,
    project_slug: str,
    status: str | None = None,
    priority: str | None = None,
) -> list[JSON]:
    return client.list_tasks(project_slug, status=status, priority=priority)


def get_task(client: BackendClient, task_id: str) -> JSON:
    return client.get_task(task_id)


def get_note(client: BackendClient, note_id: str) -> JSON:
    return client.get_note(note_id)


def list_documents(client: BackendClient, project_slug: str) -> list[JSON]:
    return [
        {
            "id": d["id"],
            "title": d["title"],
            "filename": d.get("filename"),
            "mime_type": d.get("mime_type"),
            "tags": d.get("tags") or [],
        }
        for d in client.list_documents(project_slug)
    ]


def get_document(client: BackendClient, document_id: str) -> JSON:
    return client.get_document(document_id)


# -- skills ----------------------------------------------------------------


def get_project_skills(client: BackendClient, project_slug: str) -> list[JSON]:
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "slug": s["slug"],
            "scope": s.get("scope"),
            "description": s.get("description"),
        }
        for s in client.list_project_skills(project_slug)
    ]


def get_skill(
    client: BackendClient, skill_slug: str, project_slug: str | None = None
) -> str:
    candidates: list[JSON] = []
    if project_slug:
        candidates.extend(client.list_project_skills(project_slug))
    candidates.extend(client.list_global_skills())
    for skill in candidates:
        if skill.get("slug") == skill_slug:
            return skill.get("content") or ""
    raise ValueError(f"skill {skill_slug!r} not found")


# -- search ----------------------------------------------------------------


def search_knowledge(
    client: BackendClient,
    query: str,
    mode: str = "hybrid",
    project_slug: str | None = None,
    domain_slug: str | None = None,
    kinds: list[str] | None = None,
    limit: int | None = None,
) -> list[JSON]:
    return client.search(
        query,
        mode=mode,
        project_slug=project_slug,
        domain_slug=domain_slug,
        kinds=kinds,
        limit=limit,
    )


# -- generation ------------------------------------------------------------


def prepare_generation(
    client: BackendClient,
    project_slug: str,
    artifact_type_slug: str,
    domain_slug: str | None = None,
    note_ids: list[str] | None = None,
    task_ids: list[str] | None = None,
) -> str:
    project = client.get_project(project_slug)
    artifact_type = _resolve_artifact_type(client, artifact_type_slug, project_slug)
    domains = client.list_domains(project_slug)

    focused = bool(note_ids or task_ids)
    if focused:
        notes = [client.get_note(nid) for nid in note_ids or []]
        tasks = [client.get_task(tid) for tid in task_ids or []]
    else:
        notes = client.list_notes(project_slug)
        tasks = client.list_tasks(project_slug)
        if domain_slug:
            scope_id = _domain_id(domains, domain_slug)
            notes = [n for n in notes if n.get("domain_id") == scope_id]
            tasks = [t for t in tasks if t.get("domain_id") == scope_id]

    return render_generation_bundle(
        project=project,
        artifact_type=artifact_type,
        domains=domains,
        notes=notes,
        tasks=tasks,
        documents=client.list_documents(project_slug),
        skills=client.list_project_skills(project_slug),
        domain_slug=domain_slug if not focused else None,
        focused=focused,
    )


# -- write tools -----------------------------------------------------------


def save_artifact(
    client: BackendClient,
    project_slug: str,
    artifact_type_slug: str,
    title: str,
    files: list[JSON],
    domain_slug: str | None = None,
    source_note_ids: list[str] | None = None,
    source_task_ids: list[str] | None = None,
    source_document_ids: list[str] | None = None,
) -> JSON:
    domain_id: str | None = None
    if domain_slug:
        domain_id = _domain_id(client.list_domains(project_slug), domain_slug)

    body: JSON = {
        "artifact_type_slug": artifact_type_slug,
        "title": title,
        "files": [
            {"path": f["path"], "content": f["content"], "note": f.get("note")}
            for f in files
        ],
        "domain_id": domain_id,
        "source_note_ids": source_note_ids,
        "source_task_ids": source_task_ids,
        "source_document_ids": source_document_ids,
    }
    # Drop unset optionals so the backend applies its own defaults rather than
    # rejecting an explicit ``null`` for its non-nullable list fields.
    body = {key: value for key, value in body.items() if value is not None}
    return client.save_artifact(project_slug, body)


def update_phase_status(
    client: BackendClient,
    artifact_id: str,
    phase_id: str,
    status: str,
    note: str | None = None,
) -> JSON:
    return client.update_phase(artifact_id, phase_id, status=status, note=note)


# -- helpers ---------------------------------------------------------------


def _resolve_artifact_type(
    client: BackendClient, type_slug: str, project_slug: str | None
) -> JSON:
    for artifact_type in client.list_artifact_types(project_slug):
        if artifact_type.get("slug") == type_slug:
            return artifact_type
    scope = f" for project {project_slug!r}" if project_slug else ""
    raise ValueError(f"artifact type {type_slug!r} not found{scope}")


def _domain_id(domains: list[JSON], domain_slug: str) -> str:
    for domain in domains:
        if domain.get("slug") == domain_slug:
            return domain["id"]
    raise ValueError(f"domain {domain_slug!r} not found in project")
