"""Test fixtures: a fake ProjectNotes backend served via httpx.MockTransport.

``BackendClient`` accepts an injected ``httpx.Client``, so we back it with a
``MockTransport`` whose handler routes a small, realistic dataset. Write
requests (POST/PATCH) are recorded on the fake for assertions. No live backend
or network is involved, so the suite is deterministic and fast.
"""

from __future__ import annotations

import json
import re
from collections.abc import Generator
from typing import Any

import httpx
import pytest

from project_notes_mcp.client import BackendClient

JSON = dict[str, Any]

PROJECT_SLUG = "acme"

# Mirror the backend StrEnums so the fake backend can 422 on invalid values,
# the same way the real Pydantic schemas do.
_NOTE_TYPES = {"REQUIREMENT", "CONSTRAINT", "DECISION", "QUESTION", "SNIPPET", "REFERENCE"}
_TASK_STATUSES = {"TODO", "IN_PROGRESS", "DONE"}
_TASK_PRIORITIES = {"LOW", "MEDIUM", "HIGH"}

_PROJECT: JSON = {
    "id": "p1",
    "name": "Acme",
    "slug": PROJECT_SLUG,
    "description": "A demo project.",
    "status": "ACTIVE",
    "repository_url": None,
    "metadata": {},
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
    "technologies": [
        {"id": "t1", "kind": "LANGUAGE", "name": "Python", "slug": "python", "version": None},
        {"id": "t2", "kind": "FRAMEWORK", "name": "FastAPI", "slug": "fastapi", "version": None},
    ],
    "note_count": 2,
    "task_count": 3,
    "artifact_count": 1,
}

_DOMAINS: list[JSON] = [
    {
        "id": "d1",
        "project_id": "p1",
        "name": "Billing",
        "slug": "billing",
        "description": "Invoices and payments.",
        "ubiquitous_language": {
            "Invoice": "A request for payment",
            "Dunning": "Chasing late payment",
        },
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    },
]

_NOTES: list[JSON] = [
    {
        "id": "n1", "project_id": "p1", "domain_id": "d1", "type": "REQUIREMENT",
        "title": "Charge monthly", "content": "Bill customers on the 1st.",
        "tags": ["mvp"], "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "n2", "project_id": "p1", "domain_id": None, "type": "DECISION",
        "title": "Use Stripe", "content": "Stripe for card processing.",
        "tags": [], "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

# t-a depends on t-b; ensure ordering puts t-b before t-a despite input order.
_TASKS: list[JSON] = [
    {
        "id": "t-a", "project_id": "p1", "domain_id": "d1", "title": "Build invoice UI",
        "description": "Render invoices.", "status": "TODO", "priority": "HIGH",
        "depends_on": ["t-b"], "tags": [], "blocked": True,
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "t-b", "project_id": "p1", "domain_id": "d1", "title": "Design invoice schema",
        "description": "DB tables.", "status": "TODO", "priority": "MEDIUM",
        "depends_on": [], "tags": [], "blocked": False,
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
    {
        "id": "t-c", "project_id": "p1", "domain_id": None, "title": "Spike Stripe SDK",
        "description": "", "status": "DONE", "priority": "LOW",
        "depends_on": [], "tags": [], "blocked": False,
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_DOCUMENTS: list[JSON] = [
    {
        "id": "doc1", "project_id": "p1", "domain_id": None, "title": "Pricing PDF",
        "filename": "pricing.pdf", "mime_type": "application/pdf",
        "extracted_text": "Tier A costs 10 EUR.", "tags": ["pricing"],
        "indexed_at": "2026-01-01T00:00:00Z",
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_SKILLS: list[JSON] = [
    {
        "id": "s1", "scope": "PROJECT", "project_id": "p1", "name": "Billing Rules",
        "slug": "billing-rules", "description": "How we bill.",
        "content": "# Billing Rules\nAlways prorate.", "tags": [],
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_GLOBAL_SKILLS: list[JSON] = [
    {
        "id": "s2", "scope": "GLOBAL", "project_id": None, "name": "Clean Code",
        "slug": "clean-code", "description": "Write clean code.",
        "content": "# Clean Code\nKISS.", "tags": [],
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_ARTIFACT_TYPES: list[JSON] = [
    {
        "id": "at1", "scope": "GLOBAL", "project_id": None, "name": "Development Plan",
        "slug": "development-plan", "description": "A phased build plan.",
        "instructions": "Produce a phased plan.", "is_default": True,
        "output_files": [{"path": "PLAN.md", "note": "The main plan"}],
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_ARTIFACTS: list[JSON] = [
    {
        "id": "a1", "project_id": "p1", "domain_id": None, "artifact_type_id": "at1",
        "title": "Acme Plan", "slug": "acme-plan", "status": "DRAFT",
        "current_version_id": "v1",
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    },
]

_ARTIFACT_DETAIL: JSON = {
    "artifact": _ARTIFACTS[0],
    "artifact_type_slug": "development-plan",
    "current_version_number": 1,
    "files": [{"id": "f1", "artifact_version_id": "v1", "path": "PLAN.md",
               "content": "# Plan\n## Phase 1", "note": None, "order_index": 0}],
    "phases": [{"id": "ph1", "artifact_version_id": "v1", "order_index": 0,
                "title": "Phase 1", "status": "PENDING", "note": None,
                "updated_at": "2026-01-01T00:00:00Z"}],
    "versions": [{"version_number": 1, "id": "v1", "created_at": "2026-01-01T00:00:00Z",
                  "change_note": None}],
    "coverage": {"present": ["PLAN.md"], "missing": [], "extra": [], "is_complete": True},
}


class FakeBackend:
    """Routes requests against the in-memory dataset; records writes."""

    def __init__(self) -> None:
        self.posts: list[tuple[str, JSON]] = []
        self.patches: list[tuple[str, JSON]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method
        params = request.url.params

        if method == "POST":
            body = json.loads(request.content or b"{}")
            self.posts.append((path, body))
            if re.fullmatch(r"/projects/[^/]+/artifacts", path):
                return _ok(_ARTIFACT_DETAIL, status=201)
            if re.fullmatch(r"/projects/[^/]+/notes", path):
                if body.get("type") not in _NOTE_TYPES:
                    return _ok({"detail": f"invalid note type: {body.get('type')!r}"}, status=422)
                return _ok(_created_note(body), status=201)
            if re.fullmatch(r"/projects/[^/]+/tasks", path):
                if (bad := _invalid_task_enum(body)) is not None:
                    return _ok({"detail": bad}, status=422)
                return _ok(_created_task(body), status=201)
            return _ok({}, status=201)

        if method == "PATCH":
            body = json.loads(request.content or b"{}")
            self.patches.append((path, body))
            m = re.fullmatch(r"/artifacts/[^/]+/phases/([^/]+)", path)
            if m:
                return _ok({
                    "id": m.group(1), "artifact_version_id": "v1", "order_index": 0,
                    "title": "Phase 1", "status": body.get("status"),
                    "note": body.get("note"), "updated_at": "2026-01-01T00:00:00Z",
                })
            return _ok({})

        # -- GET routing ---------------------------------------------------
        routes: dict[str, Any] = {
            "/projects": _list(_PROJECT),
            f"/projects/{PROJECT_SLUG}": _PROJECT,
            f"/projects/{PROJECT_SLUG}/domains": _DOMAINS,
            f"/projects/{PROJECT_SLUG}/notes": _NOTES,
            f"/projects/{PROJECT_SLUG}/documents": _DOCUMENTS,
            f"/projects/{PROJECT_SLUG}/skills": _SKILLS,
            f"/projects/{PROJECT_SLUG}/artifact-types": _ARTIFACT_TYPES,
            f"/projects/{PROJECT_SLUG}/artifacts": _ARTIFACTS,
            "/skills": _GLOBAL_SKILLS,
            "/artifact-types": _ARTIFACT_TYPES,
            "/artifacts/a1": _ARTIFACT_DETAIL,
            "/artifacts/a1/versions": _ARTIFACT_DETAIL["versions"],
            "/artifacts/a1/versions/1": {
                "id": "v1", "artifact_id": "a1", "version_number": 1,
                "source_note_ids": [], "source_task_ids": [], "source_document_ids": [],
                "change_note": None, "created_at": "2026-01-01T00:00:00Z",
                "files": _ARTIFACT_DETAIL["files"],
            },
            "/notes/n1": _NOTES[0],
            "/notes/n2": _NOTES[1],
            "/tasks/t-a": _TASKS[0],
            "/tasks/t-b": _TASKS[1],
            "/documents/doc1": _DOCUMENTS[0],
        }
        if path == f"/projects/{PROJECT_SLUG}/tasks":
            return _ok(_filter_tasks(params))
        if path == "/search":
            return _ok(_search(params))
        if path in routes:
            return _ok(routes[path])
        return _ok({"detail": f"not found: {method} {path}"}, status=404)


def _ok(payload: Any, *, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=payload)


def _created_note(body: JSON) -> JSON:
    """Echo a NoteRead as the real backend would (applying its defaults)."""
    return {
        "id": "new-note", "project_id": "p1",
        "domain_id": body.get("domain_id"),
        "type": body.get("type"), "title": body.get("title"),
        "content": body.get("content", ""), "tags": body.get("tags", []),
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    }


def _invalid_task_enum(body: JSON) -> str | None:
    """Return a 422 detail if status/priority are present but invalid, else None.

    Mirrors the backend: status/priority are optional (defaulted), so only a
    *present* wrong value is rejected.
    """
    status = body.get("status")
    if status is not None and status not in _TASK_STATUSES:
        return f"invalid task status: {status!r}"
    priority = body.get("priority")
    if priority is not None and priority not in _TASK_PRIORITIES:
        return f"invalid task priority: {priority!r}"
    return None


def _created_task(body: JSON) -> JSON:
    """Echo a TaskRead as the real backend would (applying its defaults)."""
    return {
        "id": "new-task", "project_id": "p1",
        "domain_id": body.get("domain_id"),
        "title": body.get("title"), "description": body.get("description"),
        "status": body.get("status", "TODO"), "priority": body.get("priority", "MEDIUM"),
        "depends_on": body.get("depends_on", []), "tags": body.get("tags", []),
        "blocked": False,
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-01-01T00:00:00Z",
    }


def _list(*items: JSON) -> list[JSON]:
    return list(items)


def _filter_tasks(params: httpx.QueryParams) -> list[JSON]:
    tasks = _TASKS
    if status := params.get("status"):
        tasks = [t for t in tasks if t["status"] == status]
    if priority := params.get("priority"):
        tasks = [t for t in tasks if t["priority"] == priority]
    return tasks


def _search(params: httpx.QueryParams) -> list[JSON]:
    return [
        {"kind": "note", "id": "n1", "title": "Charge monthly", "project_id": "p1",
         "domain_id": "d1", "snippet": "Bill customers on the <em>1st</em>.",
         "score": 0.9, "path": None},
    ]


@pytest.fixture
def fake_backend() -> FakeBackend:
    return FakeBackend()


@pytest.fixture
def client(fake_backend: FakeBackend) -> Generator[BackendClient, None, None]:
    http = httpx.Client(transport=httpx.MockTransport(fake_backend.handler),
                        base_url="http://backend.test")
    backend = BackendClient(http_client=http)
    yield backend
    backend.close()
