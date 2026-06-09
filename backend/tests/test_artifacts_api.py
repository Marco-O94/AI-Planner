"""Phase 2: artifact versioning, manifest coverage, phases, diff, export,
and reverse lookups."""

import io
import uuid
import zipfile

from fastapi.testclient import TestClient


def _custom_type(client: TestClient, output_files: list[dict]) -> str:
    resp = client.post(
        "/artifact-types",
        json={
            "scope": "GLOBAL",
            "name": f"Type {uuid.uuid4().hex[:8]}",
            "instructions": "produce files",
            "output_files": output_files,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["slug"]


def _save(client: TestClient, slug: str, **body) -> dict:
    resp = client.post(f"/projects/{slug}/artifacts", json=body)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_save_creates_v1_then_appends_v2(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    title = f"Plan {uuid.uuid4().hex[:6]}"
    first = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=title,
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "# Plan\nv1"}],
    )
    assert first["current_version_number"] == 1

    second = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=title,
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "# Plan\nv2"}],
        change_note="revise",
    )
    assert second["current_version_number"] == 2
    assert second["artifact"]["id"] == first["artifact"]["id"]
    assert len(second["versions"]) == 2


def test_manifest_coverage_reports_missing_and_extra(
    client: TestClient, make_project
) -> None:
    slug = make_project()["slug"]
    type_slug = _custom_type(client, [{"path": "a.md"}, {"path": "b.md"}])
    detail = _save(
        client,
        slug,
        artifact_type_slug=type_slug,
        title=f"Cov {uuid.uuid4().hex[:6]}",
        files=[
            {"path": "a.md", "content": "A"},
            {"path": "c.md", "content": "C"},
        ],
    )
    coverage = detail["coverage"]
    assert coverage["present"] == ["a.md"]
    assert coverage["missing"] == ["b.md"]
    assert coverage["extra"] == ["c.md"]
    assert coverage["is_complete"] is False


def test_phases_parsed_from_markdown_headings(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    content = "# Title\n\n## Phase 1 — Setup\ntext\n\n## Phase 2 — Build\nmore\n"
    detail = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=f"Phased {uuid.uuid4().hex[:6]}",
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": content}],
    )
    titles = [p["title"] for p in detail["phases"]]
    assert titles == ["Phase 1 — Setup", "Phase 2 — Build"]


def test_phase_status_can_be_updated(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    detail = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=f"Track {uuid.uuid4().hex[:6]}",
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "## Phase 1 — A\n"}],
    )
    artifact_id = detail["artifact"]["id"]
    phase_id = detail["phases"][0]["id"]
    resp = client.patch(
        f"/artifacts/{artifact_id}/phases/{phase_id}",
        json={"status": "IN_PROGRESS", "note": "started"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "IN_PROGRESS"


def test_diff_between_versions(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    title = f"Diff {uuid.uuid4().hex[:6]}"
    _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=title,
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "alpha\n"}],
    )
    saved = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=title,
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "beta\n"}],
    )
    artifact_id = saved["artifact"]["id"]
    resp = client.get(
        f"/artifacts/{artifact_id}/diff",
        params={"from": 1, "to": 2, "path": "IMPLEMENTATION_PLAN.md"},
    )
    assert resp.status_code == 200
    assert "-alpha" in resp.text and "+beta" in resp.text


def test_export_single_file(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    saved = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=f"Single {uuid.uuid4().hex[:6]}",
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "solo"}],
    )
    resp = client.get(f"/artifacts/{saved['artifact']['id']}/export")
    assert resp.status_code == 200
    assert resp.text == "solo"


def test_export_multiple_files_as_zip(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    type_slug = _custom_type(client, [{"path": "a.md"}, {"path": "b.md"}])
    saved = _save(
        client,
        slug,
        artifact_type_slug=type_slug,
        title=f"Bundle {uuid.uuid4().hex[:6]}",
        files=[
            {"path": "a.md", "content": "A"},
            {"path": "b.md", "content": "B"},
        ],
    )
    resp = client.get(f"/artifacts/{saved['artifact']['id']}/export")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/zip")
    with zipfile.ZipFile(io.BytesIO(resp.content)) as archive:
        assert set(archive.namelist()) == {"a.md", "b.md"}


def test_saving_plan_marks_source_notes_ai_processed(client: TestClient, make_project) -> None:
    project = make_project()
    slug = project["slug"]
    used = client.post(
        f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "used"}
    ).json()
    client.post(f"/projects/{slug}/notes", json={"type": "DECISION", "content": "untouched"})
    assert client.get(f"/projects/{slug}").json()["note_count"] == 2

    _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=f"Plan {uuid.uuid4().hex[:6]}",
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "x"}],
        source_note_ids=[used["id"]],
    )

    # The note that fed the plan is now processed; the other still counts.
    assert client.get(f"/notes/{used['id']}").json()["ai_processed"] is True
    assert client.get(f"/projects/{slug}").json()["note_count"] == 1
    open_notes = client.get(f"/projects/{slug}/notes", params={"processed": "false"}).json()
    assert [n["content"] for n in open_notes] == ["untouched"]


def test_reverse_lookup_from_note_and_task(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    note = client.post(
        f"/projects/{slug}/notes", json={"type": "REQUIREMENT", "content": "ctx"}
    ).json()
    task = client.post(f"/projects/{slug}/tasks", json={"title": "do it"}).json()
    saved = _save(
        client,
        slug,
        artifact_type_slug="development-plan",
        title=f"Linked {uuid.uuid4().hex[:6]}",
        files=[{"path": "IMPLEMENTATION_PLAN.md", "content": "x"}],
        source_note_ids=[note["id"]],
        source_task_ids=[task["id"]],
    )
    artifact_id = saved["artifact"]["id"]

    from_note = client.get(f"/notes/{note['id']}/artifacts").json()
    from_task = client.get(f"/tasks/{task['id']}/artifacts").json()
    assert artifact_id in {a["id"] for a in from_note}
    assert artifact_id in {a["id"] for a in from_task}
