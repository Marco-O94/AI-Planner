"""HTTP client for the ProjectNotes backend.

A thin, synchronous wrapper around ``httpx`` exposing one method per backend
endpoint the MCP tools need. The client owns no business logic — it just maps
calls to routes and surfaces backend errors as :class:`BackendError`.

Decoupling rule: this module only speaks HTTP to the backend; it never imports
backend code.
"""

from __future__ import annotations

from typing import Any

import httpx

JSON = dict[str, Any]


class BackendError(RuntimeError):
    """Raised when the backend returns a non-2xx response or is unreachable."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class BackendClient:
    """Synchronous client over the ProjectNotes REST API.

    Pass ``http_client`` to inject a pre-built ``httpx.Client`` (e.g. one backed
    by ``httpx.MockTransport`` in tests). Otherwise a real client bound to
    ``base_url`` is created.
    """

    def __init__(
        self,
        base_url: str = "",
        *,
        timeout: float = 30.0,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._client = http_client or httpx.Client(base_url=base_url, timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> BackendClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    # -- low-level helpers -------------------------------------------------

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = self._client.request(method, path, **kwargs)
        except httpx.HTTPError as exc:  # network/timeout/connect errors
            raise BackendError(f"backend unreachable ({path}): {exc}") from exc

        if response.is_success:
            if response.status_code == 204 or not response.content:
                return None
            return response.json()

        detail = _extract_detail(response)
        raise BackendError(
            f"backend {response.status_code} on {method} {path}: {detail}",
            status_code=response.status_code,
        )

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self._request("GET", path, params=_clean(params))

    def _post(self, path: str, json: JSON | None = None) -> Any:
        return self._request("POST", path, json=json)

    def _patch(self, path: str, json: JSON | None = None) -> Any:
        return self._request("PATCH", path, json=json)

    # -- projects / domains ------------------------------------------------

    def list_projects(self) -> list[JSON]:
        return self._get("/projects")

    def get_project(self, slug: str) -> JSON:
        return self._get(f"/projects/{slug}")

    def list_domains(self, project_slug: str) -> list[JSON]:
        return self._get(f"/projects/{project_slug}/domains")

    # -- notes / tasks / documents ----------------------------------------

    def list_notes(
        self, project_slug: str, *, processed: bool | None = None
    ) -> list[JSON]:
        return self._get(
            f"/projects/{project_slug}/notes", params={"processed": processed}
        )

    def create_note(self, project_slug: str, body: JSON) -> JSON:
        return self._post(f"/projects/{project_slug}/notes", json=body)

    def get_note(self, note_id: str) -> JSON:
        return self._get(f"/notes/{note_id}")

    def mark_notes_processed(self, project_slug: str, body: JSON) -> list[JSON]:
        return self._post(f"/projects/{project_slug}/notes/mark-ai-processed", json=body)

    def list_tasks(
        self,
        project_slug: str,
        *,
        status: str | None = None,
        priority: str | None = None,
    ) -> list[JSON]:
        return self._get(
            f"/projects/{project_slug}/tasks",
            params={"status": status, "priority": priority},
        )

    def create_task(self, project_slug: str, body: JSON) -> JSON:
        return self._post(f"/projects/{project_slug}/tasks", json=body)

    def create_tasks_from_notes(self, project_slug: str, body: JSON) -> list[JSON]:
        return self._post(f"/projects/{project_slug}/tasks/from-notes", json=body)

    def get_task(self, task_id: str) -> JSON:
        return self._get(f"/tasks/{task_id}")

    def list_documents(self, project_slug: str) -> list[JSON]:
        return self._get(f"/projects/{project_slug}/documents")

    def get_document(self, document_id: str) -> JSON:
        return self._get(f"/documents/{document_id}")

    # -- skills ------------------------------------------------------------

    def list_project_skills(self, project_slug: str) -> list[JSON]:
        return self._get(f"/projects/{project_slug}/skills")

    def list_global_skills(self) -> list[JSON]:
        return self._get("/skills")

    # -- artifact types ----------------------------------------------------

    def list_artifact_types(self, project_slug: str | None = None) -> list[JSON]:
        if project_slug:
            return self._get(f"/projects/{project_slug}/artifact-types")
        return self._get("/artifact-types")

    # -- artifacts ---------------------------------------------------------

    def list_artifacts(
        self, project_slug: str, *, artifact_type: str | None = None
    ) -> list[JSON]:
        return self._get(
            f"/projects/{project_slug}/artifacts",
            params={"artifact_type": artifact_type},
        )

    def get_artifact(self, artifact_id: str) -> JSON:
        return self._get(f"/artifacts/{artifact_id}")

    def list_versions(self, artifact_id: str) -> list[JSON]:
        return self._get(f"/artifacts/{artifact_id}/versions")

    def get_version(self, artifact_id: str, version_number: int) -> JSON:
        return self._get(f"/artifacts/{artifact_id}/versions/{version_number}")

    def save_artifact(self, project_slug: str, body: JSON) -> JSON:
        return self._post(f"/projects/{project_slug}/artifacts", json=body)

    def update_phase(
        self, artifact_id: str, phase_id: str, *, status: str, note: str | None = None
    ) -> JSON:
        return self._patch(
            f"/artifacts/{artifact_id}/phases/{phase_id}",
            json={"status": status, "note": note},
        )

    # -- search ------------------------------------------------------------

    def search(
        self,
        query: str,
        *,
        mode: str = "hybrid",
        project_slug: str | None = None,
        domain_slug: str | None = None,
        kinds: list[str] | None = None,
        limit: int | None = None,
    ) -> list[JSON]:
        return self._get(
            "/search",
            params={
                "q": query,
                "mode": mode,
                "project_slug": project_slug,
                "domain_slug": domain_slug,
                "kinds": kinds,
                "limit": limit,
            },
        )


def _clean(params: dict[str, Any] | None) -> dict[str, Any] | None:
    """Drop ``None`` values so they aren't serialized as empty query params."""
    if not params:
        return None
    return {k: v for k, v in params.items() if v is not None}


def _extract_detail(response: httpx.Response) -> str:
    """Best-effort extraction of a human-readable error message."""
    try:
        payload = response.json()
    except ValueError:
        return response.text or response.reason_phrase
    if isinstance(payload, dict):
        detail = payload.get("detail") or payload.get("message")
        if detail:
            return detail if isinstance(detail, str) else str(detail)
    return str(payload)
