"""Phase 2: skill & artifact-type scope, attachment, and protected default."""

import uuid

from fastapi.testclient import TestClient


def test_global_skill_with_project_is_rejected(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    resp = client.post(
        "/skills",
        json={
            "scope": "GLOBAL",
            "name": "Bad",
            "description": "d",
            "content": "c",
            "project_slug": slug,
        },
    )
    assert resp.status_code == 422


def test_project_skill_without_project_is_rejected(client: TestClient) -> None:
    resp = client.post(
        "/skills",
        json={"scope": "PROJECT", "name": "Bad", "description": "d", "content": "c"},
    )
    assert resp.status_code == 422


def test_attach_and_detach_global_skill(client: TestClient, make_project) -> None:
    slug = make_project()["slug"]
    skill = client.post(
        "/skills",
        json={
            "scope": "GLOBAL",
            "name": f"Reviewer {uuid.uuid4().hex[:6]}",
            "description": "d",
            "content": "c",
        },
    ).json()

    assert client.post(f"/projects/{slug}/skills/{skill['id']}").status_code == 204
    applicable = client.get(f"/projects/{slug}/skills").json()
    assert skill["id"] in {s["id"] for s in applicable}

    assert client.delete(f"/projects/{slug}/skills/{skill['id']}").status_code == 204
    applicable_after = client.get(f"/projects/{slug}/skills").json()
    assert skill["id"] not in {s["id"] for s in applicable_after}

    client.delete(f"/skills/{skill['id']}")


def test_cannot_attach_project_scoped_skill(client: TestClient, make_project) -> None:
    owner = make_project()["slug"]
    other = make_project()["slug"]
    skill = client.post(
        "/skills",
        json={
            "scope": "PROJECT",
            "name": "Local",
            "description": "d",
            "content": "c",
            "project_slug": owner,
        },
    ).json()
    resp = client.post(f"/projects/{other}/skills/{skill['id']}")
    assert resp.status_code == 422


def test_global_artifact_type_with_project_is_rejected(
    client: TestClient, make_project
) -> None:
    slug = make_project()["slug"]
    resp = client.post(
        "/artifact-types",
        json={
            "scope": "GLOBAL",
            "name": "Bad",
            "instructions": "x",
            "project_slug": slug,
        },
    )
    assert resp.status_code == 422


def test_default_artifact_type_cannot_be_deleted(client: TestClient) -> None:
    globals_ = client.get("/artifact-types?scope=GLOBAL").json()
    default = next(t for t in globals_ if t["is_default"])
    assert default["slug"] == "development-plan"
    resp = client.delete(f"/artifact-types/{default['id']}")
    assert resp.status_code == 409


def test_create_custom_artifact_type(client: TestClient) -> None:
    name = f"Research {uuid.uuid4().hex[:6]}"
    resp = client.post(
        "/artifact-types",
        json={
            "scope": "GLOBAL",
            "name": name,
            "instructions": "synthesize",
            "output_files": [{"path": "synthesis.md", "note": "main findings"}],
        },
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["is_default"] is False
    assert created["output_files"][0]["path"] == "synthesis.md"
    client.delete(f"/artifact-types/{created['id']}")
